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

    // 2) jembatan SEP-24: withdraw interaktif + pembayaran Classic ber-memo ke anchor.
    //    Best-effort — kegagalan anchor tidak membatalkan claim (dana sudah di settlement).
    let instructions: string | undefined;
    try {
      const amountUsdc = (Number(t.amountUsdcStroops) / 1e7).toFixed(2);
      const wd = await startWithdraw(amountUsdc);
      if (!wd.simulated) {
        const info = await getWithdrawInfo(wd.anchorTxId);
        if (info.withdrawAnchorAccount && info.withdrawMemo) {
          // bayar sesuai jumlah withdraw yang diterima anchor (sudah di-clamp limit)
          await payAnchorWithMemo(
            info.withdrawAnchorAccount,
            wd.amountUsdc,
            info.withdrawMemo,
            info.withdrawMemoType
          );
        }
        instructions = `Withdrawal SEP-24 dimulai (anchor tx ${wd.anchorTxId}).`;
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

    const res: PayoutResponse = {
      status: "PAID_OUT",
      simulatedPayout: true,
      ...(cashCode
        ? {
            cashCode,
            instructions:
              instructions ??
              "Tunjukkan kode ini di gerai tunai (payout gerai disimulasikan untuk demo).",
          }
        : {
            instructions:
              instructions ?? `Dana disimulasikan dikirim ke ${payoutMethod}.`,
          }),
    };
    return res;
  });
}
