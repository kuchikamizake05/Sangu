// Rute sisi penerima (spec §2.3). Akses via token link (tanpa login).
// OTP = gerbang manusia; secret dipegang backend, diungkap ke contract saat claim.
//
// Alur payout nyata: verifikasi OTP → escrow.claim(escrowId, secret, SETTLEMENT) →
// SEP-24 withdraw (SDF Test Anchor) → bayar Classic ber-memo ke anchor.
// NB (review #5): withdrawal SEP-24 = REAL protokol, tetapi settlement DANA/GoPay/tunai
// IDR = DISIMULASIKAN di layer anchor → semua respons payout bertanda simulatedPayout:true.
import crypto from "node:crypto";
import type { FastifyInstance, FastifyReply } from "fastify";
import type { ClaimInfo, PayoutRequest, PayoutResponse, TransferStatus } from "../lib/types.js";
import {
  getTransferByToken,
  recordTransferEvent,
  updateTransfer,
  createClaimSession,
  validateClaimSession,
  type TransferRecord,
} from "../lib/db.js";
import { sendOtp, verifyOtpCode } from "../lib/otp.js";
import { isOnchainEnabled, claim as escrowClaim } from "../stellar/escrow.js";
import {
  settlementAddress,
  startWithdraw,
  completeInteractiveWithdraw,
  getWithdrawInfo,
  payAnchorWithMemo,
} from "../anchor/sep24.js";

function notFound(reply: FastifyReply) {
  reply.code(404);
  return { error: { code: "NOT_FOUND", message: "link claim tidak dikenal" } };
}

/** Status efektif: PENDING yang sudah lewat expiry ditampilkan EXPIRED (keeper akan me-refund). */
function effectiveStatus(t: TransferRecord): TransferStatus {
  if (t.status === "PENDING" && Math.floor(Date.now() / 1000) >= t.expiry) return "EXPIRED";
  return t.status;
}

/**
 * Final dari sudut pandang penerima: anchor sudah terbayar/terminal, atau jalur
 * simulasi (tanpa anchor nyata). false hanya bila withdrawal anchor masih in-flight
 * (poller sedang bekerja) — frontend menampilkan "diproses" lalu polling.
 */
function payoutCompleted(t: TransferRecord): boolean {
  if (t.status !== "PAID_OUT") return false;
  if (!t.anchorTxId || t.anchorTxId.startsWith("SIM-")) return true;
  if (t.anchorPaymentTxHash) return true;
  return !["incomplete", "pending_user_transfer_start", "pending_anchor", "pending_stellar", null].includes(t.anchorStatus);
}

export default async function claimRoutes(app: FastifyInstance) {
  app.get("/api/claim/:token", async (req, reply): Promise<unknown> => {
    const { token } = req.params as { token: string };
    const t = await getTransferByToken(token);
    if (!t) return notFound(reply);
    // jangan bocorkan secret/escrowId/nomor HP — hanya info tampilan
    const info: ClaimInfo = {
      senderName: t.senderName,
      amountIdr: t.amountIdr,
      corridor: t.corridor,
      status: effectiveStatus(t),
      payoutCompleted: payoutCompleted(t),
    };
    return info;
  });

  app.post("/api/claim/:token/otp/request", async (req, reply): Promise<unknown> => {
    const { token } = req.params as { token: string };
    const t = await getTransferByToken(token);
    if (!t) return notFound(reply);
    if (effectiveStatus(t) !== "PENDING") {
      reply.code(409);
      return { error: { code: "NOT_CLAIMABLE", message: "transfer sudah cair/expired" } };
    }
    // nomor HP diambil dari DB backend (via token), TIDAK dari input publik
    return sendOtp(token, t.phoneE164);
  });

  app.post("/api/claim/:token/otp/verify", async (req, reply): Promise<unknown> => {
    const { token } = req.params as { token: string };
    const { code } = req.body as { code: string };
    const t = await getTransferByToken(token);
    if (!t) return notFound(reply);
    const ok = await verifyOtpCode(token, t.phoneE164, String(code ?? ""));
    if (!ok) {
      reply.code(401);
      return { error: { code: "OTP_INVALID", message: "kode OTP salah atau kedaluwarsa" } };
    }
    return { ok: true, claimSession: await createClaimSession(token) };
  });

  app.post("/api/claim/:token/payout", async (req, reply): Promise<unknown> => {
    const { token } = req.params as { token: string };
    const body = req.body as PayoutRequest;
    const t = await getTransferByToken(token);
    if (!t) return notFound(reply);

    // payout hanya boleh dipicu pemegang sesi OTP yang valid
    if (!body.claimSession || !(await validateClaimSession(token, body.claimSession))) {
      reply.code(401);
      return { error: { code: "SESSION_INVALID", message: "verifikasi OTP dulu" } };
    }
    const status = effectiveStatus(t);
    if (status !== "PENDING") {
      reply.code(409);
      return { error: { code: "NOT_CLAIMABLE", message: `status transfer: ${status}` } };
    }

    // 1) claim on-chain → dana USDC pindah escrow → akun settlement (allowlist)
    let claimTxHash: string | null = null;
    if (isOnchainEnabled() && t.escrowId && !t.escrowId.startsWith("SIM-")) {
      const secret = Buffer.from(t.secretHex, "hex");
      ({ txHash: claimTxHash } = await escrowClaim(t.escrowId, secret, settlementAddress()));
    }
    await updateTransfer(t.transferId, { status: "CLAIMED", claimTxHash });
    await recordTransferEvent(t.transferId, "CLAIMED");

    // 2) jembatan SEP-24: mulai withdraw interaktif. Anchor BARU memberi akun tujuan +
    //    memo setelah penerima menyelesaikan interactive URL — jadi pembayaran Classic
    //    ber-memo TIDAK dilakukan di sini, melainkan oleh poller di scheduler yang
    //    memantau status anchor (fast-path di bawah menangani anchor yang langsung siap).
    //    Best-effort — kegagalan anchor tidak membatalkan claim (dana sudah di settlement).
    //    CATATAN PRODUK: seluruh urusan anchor adalah tugas OPERATOR, bukan penerima —
    //    anchorTxId/interactiveUrl disimpan di DB (dipantau poller + tampil di detail
    //    pengirim) tapi TIDAK dikirim ke penerima; dia hanya melihat Rupiah.
    try {
      const amountUsdc = (Number(t.amountUsdcStroops) / 1e7).toFixed(2);
      const wd = await startWithdraw(amountUsdc);
      if (!wd.simulated) {
        let anchorStatus: string | null = null;
        let anchorPaymentTxHash: string | null = null;
        // Langkah interaktif diselesaikan TERPROGRAM (tugas operator terotomasi) —
        // best-effort; bila gagal, poller scheduler mengulanginya tiap tick.
        try {
          await completeInteractiveWithdraw(wd.interactiveUrl, wd.amountUsdc);
        } catch (err) {
          req.log.warn({ err, anchorTxId: wd.anchorTxId }, "otomasi interactive anchor gagal — poller akan mencoba lagi");
        }
        // Fast-path: bila anchor langsung siap, bayar sekarang.
        const info = await getWithdrawInfo(wd.anchorTxId);
        anchorStatus = info.status;
        if (info.withdrawAnchorAccount && info.withdrawMemo) {
          // bayar sesuai jumlah withdraw yang diterima anchor (sudah di-clamp limit)
          ({ txHash: anchorPaymentTxHash } = await payAnchorWithMemo(
            info.withdrawAnchorAccount,
            wd.amountUsdc,
            info.withdrawMemo,
            info.withdrawMemoType
          ));
        }
        await updateTransfer(t.transferId, {
          anchorTxId: wd.anchorTxId,
          anchorStatus,
          anchorAmountUsdc: wd.amountUsdc,
          anchorInteractiveUrl: wd.interactiveUrl,
          anchorPaymentTxHash,
        });
      }
    } catch (err) {
      req.log.warn({ err }, "jembatan SEP-24 gagal — claim tetap sah, payout disimulasikan");
    }

    // 3) hasil ke penerima — settlement fiat selalu bertanda simulasi (jujur)
    const payoutMethod = body.method;
    let cashCode: string | null = null;
    if (payoutMethod === "cash") {
      cashCode =
        "SANGU-" +
        crypto.randomInt(1000, 9999).toString() +
        "-" +
        crypto.randomInt(1000, 9999).toString();
    }
    await updateTransfer(t.transferId, { status: "PAID_OUT", payoutMethod, cashCode });
    await recordTransferEvent(t.transferId, "PAID_OUT");

    const methodLabel: Record<string, string> = { dana: "DANA", gopay: "GoPay", bank: "rekening bankmu", cash: "gerai tunai" };
    const res: PayoutResponse = {
      status: "PAID_OUT",
      simulatedPayout: true,
      ...(cashCode
        ? {
            cashCode,
            instructions: "Tunjukkan kode ini beserta KTP di gerai tunai terdekat.",
          }
        : {
            instructions: `Dana sedang diproses ke ${methodLabel[payoutMethod] ?? payoutMethod}. Tidak ada yang perlu kamu lakukan lagi.`,
          }),
    };
    return res;
  });
}
