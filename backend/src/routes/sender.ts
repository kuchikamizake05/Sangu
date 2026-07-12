// Rute sisi pengirim (spec §2.3).
//
// NON-CUSTODIAL (review #3): backend TIDAK memegang key pengirim & TIDAK membelanjakan dananya.
// Kirim = 2 langkah:
//   1) POST /api/send/prepare  → backend susun XDR `deposit` unsigned + simpan secret di DB
//   2) frontend: passkey wallet meng-authorize/sign XDR
//   3) POST /api/send/submit   → backend fee (relayer) + submit signed XDR
//
// DEMO-MODE: bila ESCROW_ID/RELAYER_SECRET belum diisi (contract belum deploy) atau
// senderAddress tidak dikirim, alur tetap jalan end-to-end dengan escrow disimulasikan
// (escrowId "SIM-...") supaya frontend tidak menunggu.
import crypto from "node:crypto";
import type { FastifyInstance } from "fastify";
import { getQuote } from "../lib/fx.js";
import {
  newSecret,
  recipientCommitment,
  isOnchainEnabled,
  prepareDeposit,
  submitDeposit,
} from "../stellar/escrow.js";
import {
  createTransfer,
  getTransferById,
  updateTransfer,
  listTransfers,
  createRecurring,
} from "../lib/db.js";
import type {
  Corridor,
  PrepareSendRequest,
  PrepareSendResponse,
  SubmitSendRequest,
  SubmitSendResponse,
} from "../lib/types.js";

const BASE = process.env.PUBLIC_BASE_URL ?? "http://localhost:3000";
// Expiry default 72 jam; bisa dipendekkan via env untuk demo refund otomatis.
const EXPIRY_SECONDS = Number(process.env.EXPIRY_SECONDS ?? 72 * 3600);

const E164 = /^\+[1-9]\d{6,14}$/;

function badRequest(reply: { code: (n: number) => unknown }, message: string) {
  reply.code(400);
  return { error: { code: "BAD_REQUEST", message } };
}

/** Masking nomor HP untuk riwayat — jangan bocorkan nomor penuh ke list. */
function maskPhone(e164: string): string {
  return e164.slice(0, 6) + "•••" + e164.slice(-2);
}

export default async function senderRoutes(app: FastifyInstance) {
  app.get("/api/quote", async (req, reply) => {
    const { corridor, amountForeign } = req.query as { corridor: Corridor; amountForeign: string };
    if (corridor !== "MY" && corridor !== "HK") return badRequest(reply, "corridor harus MY|HK");
    const amt = Number(amountForeign);
    if (!Number.isFinite(amt) || amt <= 0) return badRequest(reply, "amountForeign tidak valid");
    return getQuote(corridor, amt);
  });

  // Langkah 1 — siapkan deposit (XDR unsigned untuk di-sign passkey wallet).
  app.post("/api/send/prepare", async (req, reply): Promise<unknown> => {
    const body = req.body as PrepareSendRequest;
    if (body.corridor !== "MY" && body.corridor !== "HK")
      return badRequest(reply, "corridor harus MY|HK");
    const amt = Number(body.amountForeign);
    if (!Number.isFinite(amt) || amt <= 0) return badRequest(reply, "amountForeign tidak valid");
    if (!E164.test(body.recipientPhone ?? ""))
      return badRequest(reply, "recipientPhone harus format E.164 (+62...)");

    const quote = await getQuote(body.corridor, amt);
    const expiry = Math.floor(Date.now() / 1000) + EXPIRY_SECONDS;

    const transferId = crypto.randomUUID();
    const { secret, hashlock } = newSecret();
    const nonce = crypto.randomBytes(16);
    const commitment = recipientCommitment(body.recipientPhone, nonce);
    const token = crypto.randomBytes(16).toString("hex"); // token OPAQUE — bukan secret

    // XDR nyata hanya bila on-chain terkonfigurasi DAN frontend mengirim senderAddress.
    let unsignedXDR = "DEMO_UNSIGNED_XDR"; // penanda demo-mode — frontend boleh skip sign
    if (isOnchainEnabled() && body.senderAddress) {
      ({ unsignedXDR } = await prepareDeposit({
        senderAddress: body.senderAddress,
        amount: quote.usdcStroops,
        hashlock,
        recipientCommitment: commitment,
        expiry,
      }));
    }

    // secret & phone disimpan DB — TIDAK pernah dikirim ke frontend.
    await createTransfer({
      transferId,
      token,
      escrowId: null,
      status: "PENDING",
      corridor: body.corridor,
      amountForeign: body.amountForeign,
      amountUsdcStroops: quote.usdcStroops,
      amountIdr: quote.amountIdr,
      rate: quote.rate,
      secretHex: secret.toString("hex"),
      hashlockHex: hashlock.toString("hex"),
      commitmentHex: commitment.toString("hex"),
      nonceHex: nonce.toString("hex"),
      phoneE164: body.recipientPhone,
      senderAddress: body.senderAddress ?? null,
      senderName: "Pengirim Sangu", // TODO: dari sesi login pengirim
      expiry,
      depositTxHash: null,
      claimTxHash: null,
      payoutMethod: null,
      cashCode: null,
    });

    const res: PrepareSendResponse = { transferId, unsignedXDR, quote, expiry };
    return res;
  });

  // Langkah 2 — submit XDR yang sudah di-sign passkey wallet (relayer bayar fee).
  app.post("/api/send/submit", async (req, reply): Promise<unknown> => {
    const body = req.body as SubmitSendRequest;
    const transfer = await getTransferById(body.transferId);
    if (!transfer) {
      reply.code(404);
      return { error: { code: "NOT_FOUND", message: "transfer tidak ditemukan" } };
    }
    if (transfer.escrowId) return badRequest(reply, "transfer sudah di-submit");

    let escrowId: string;
    let depositTxHash: string | null = null;
    if (isOnchainEnabled() && body.signedXDR && body.signedXDR !== "DEMO_UNSIGNED_XDR") {
      ({ escrowId, txHash: depositTxHash } = await submitDeposit(body.signedXDR));
    } else {
      // demo-mode: escrow on-chain disimulasikan
      escrowId = "SIM-" + crypto.randomBytes(4).toString("hex");
    }
    await updateTransfer(transfer.transferId, { escrowId, depositTxHash });

    const res: SubmitSendResponse = {
      transferId: transfer.transferId,
      escrowId,
      claimUrl: `${BASE}/claim/${transfer.token}`,
    };
    return res;
  });

  app.get("/api/transfers", async () =>
    (await listTransfers()).map((t) => ({
      transferId: t.transferId,
      status: t.status,
      amount: t.amountForeign,
      corridor: t.corridor,
      amountIdr: t.amountIdr,
      recipientMasked: maskPhone(t.phoneE164),
      createdAt: new Date(t.createdAt * 1000).toISOString(),
    }))
  );

  // Sangu Bulanan — scheduler menandai jatuh tempo tiap dayOfMonth.
  // Catatan roadmap: tiap kirim tetap butuh sign passkey (non-custodial), jadi trigger
  // otomatis = notifikasi "siap kirim", bukan auto-debit.
  app.post("/api/recurring", async (req, reply) => {
    const body = req.body as {
      recipientPhone: string;
      corridor: Corridor;
      amountForeign: string;
      dayOfMonth: number;
    };
    if (body.corridor !== "MY" && body.corridor !== "HK")
      return badRequest(reply, "corridor harus MY|HK");
    if (!E164.test(body.recipientPhone ?? ""))
      return badRequest(reply, "recipientPhone harus format E.164");
    const day = Number(body.dayOfMonth);
    if (!Number.isInteger(day) || day < 1 || day > 28)
      return badRequest(reply, "dayOfMonth harus 1..28");

    const recurringId = crypto.randomUUID();
    await createRecurring({
      recurringId,
      recipientPhone: body.recipientPhone,
      corridor: body.corridor,
      amountForeign: body.amountForeign,
      dayOfMonth: day,
    });
    return { recurringId };
  });
}
