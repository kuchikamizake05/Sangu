// Rute sisi pengirim (spec §2.3).
//
// NON-CUSTODIAL (review #3): backend TIDAK memegang key pengirim & TIDAK membelanjakan dananya.
// Kirim = 2 langkah:
//   1) POST /api/send/prepare  → backend susun XDR `deposit` unsigned + simpan secret di DB
//   2) frontend: passkey wallet meng-authorize/sign XDR
//   3) POST /api/send/submit   → backend fee (relayer) + submit signed XDR
//
// DEMO-MODE: bila ESCROW_ID/RELAYER_SECRET belum diisi (contract belum deploy) atau
// sender belum mendaftarkan smart wallet (passkey), alur tetap jalan end-to-end dengan
// escrow disimulasikan (escrowId "SIM-...") supaya frontend tidak menunggu.
//
// AUTH: semua route di sini butuh Bearer JWT (kecuali /api/quote) dan datanya
// ter-scope ke senderId dari sesi — lihat docs/auth-pengirim-pembagian-kerja-fe-be.md.
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
  getSenderById,
  listTransferEvents,
  recordTransferEvent,
  updateTransfer,
  listTransfers,
  createRecurring,
  deleteRecurring,
  getRecurringById,
  listRecurring,
  updateRecurring,
} from "../lib/db.js";
import { maskPhone } from "../lib/auth.js";
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

function nextRunAt(dayOfMonth: number): string {
  const now = new Date();
  let candidate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), dayOfMonth));
  if (candidate.getTime() <= now.getTime()) candidate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, dayOfMonth));
  return candidate.toISOString();
}

function badRequest(reply: { code: (n: number) => unknown }, message: string) {
  reply.code(400);
  return { error: { code: "BAD_REQUEST", message } };
}

export default async function senderRoutes(app: FastifyInstance) {
  // Semua route di file ini butuh sesi login KECUALI /api/quote (publik, untuk landing).
  const authed = { preHandler: [app.authenticate] };

  app.get("/api/quote", async (req, reply) => {
    const { corridor, amountForeign } = req.query as { corridor: Corridor; amountForeign: string };
    if (corridor !== "MY" && corridor !== "HK") return badRequest(reply, "corridor harus MY|HK");
    const amt = Number(amountForeign);
    if (!Number.isFinite(amt) || amt <= 0) return badRequest(reply, "amountForeign tidak valid");
    return getQuote(corridor, amt);
  });

  // Langkah 1 — siapkan deposit (XDR unsigned untuk di-sign passkey wallet).
  app.post("/api/send/prepare", authed, async (req, reply): Promise<unknown> => {
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

    // Identitas & wallet pengirim dari sesi login — TIDAK lagi dari body (spek auth §2.4).
    const sender = await getSenderById(req.user.senderId);
    const walletAddress = sender?.walletAddress ?? null;

    // XDR nyata hanya bila on-chain terkonfigurasi DAN sender sudah punya smart wallet.
    let unsignedXDR = "DEMO_UNSIGNED_XDR"; // penanda demo-mode — frontend boleh skip sign
    if (isOnchainEnabled() && walletAddress) {
      ({ unsignedXDR } = await prepareDeposit({
        senderAddress: walletAddress,
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
      senderId: req.user.senderId,
      senderAddress: walletAddress,
      senderName: sender?.name ?? "Pengirim Sangu",
      expiry,
      depositTxHash: null,
      claimTxHash: null,
      payoutMethod: null,
      cashCode: null,
    });
    await recordTransferEvent(transferId, "CREATED");

    const res: PrepareSendResponse = { transferId, unsignedXDR, quote, expiry };
    return res;
  });

  // Langkah 2 — submit XDR yang sudah di-sign passkey wallet (relayer bayar fee).
  app.post("/api/send/submit", authed, async (req, reply): Promise<unknown> => {
    const body = req.body as SubmitSendRequest;
    const transfer = await getTransferById(body.transferId);
    if (!transfer || transfer.senderId !== req.user.senderId) {
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
    await recordTransferEvent(transfer.transferId, "DEPOSITED");

    const res: SubmitSendResponse = {
      transferId: transfer.transferId,
      escrowId,
      claimUrl: `${BASE}/claim/${transfer.token}`,
    };
    return res;
  });

  app.get("/api/transfers", authed, async (req) =>
    (await listTransfers(req.user.senderId)).map((t) => ({
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
  app.post("/api/recurring", authed, async (req, reply) => {
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
      senderId: req.user.senderId,
      recipientPhone: body.recipientPhone,
      corridor: body.corridor,
      amountForeign: body.amountForeign,
      dayOfMonth: day,
    });
    return { recurringId };
  });

  app.get("/api/recurring", authed, async (req) =>
    (await listRecurring(req.user.senderId)).map((recurring) => ({
      recurringId: recurring.recurringId,
      recipientMasked: maskPhone(recurring.recipientPhone),
      corridor: recurring.corridor,
      amountForeign: recurring.amountForeign,
      dayOfMonth: recurring.dayOfMonth,
      status: recurring.status,
      nextRunAt: nextRunAt(recurring.dayOfMonth),
    }))
  );

  app.get("/api/transfers/:transferId", authed, async (req, reply) => {
    const { transferId } = req.params as { transferId: string };
    const transfer = await getTransferById(transferId);
    if (!transfer || transfer.senderId !== req.user.senderId) { reply.code(404); return { error: { code: "NOT_FOUND", message: "transfer tidak ditemukan" } }; }
    return {
      transferId: transfer.transferId,
      status: transfer.status,
      amount: transfer.amountForeign,
      corridor: transfer.corridor,
      amountIdr: transfer.amountIdr,
      recipientMasked: maskPhone(transfer.phoneE164),
      createdAt: new Date(transfer.createdAt * 1000).toISOString(),
      events: (await listTransferEvents(transfer.transferId)).map((event) => ({ type: event.type, occurredAt: new Date(event.occurredAt * 1000).toISOString() })),
      anchor: transfer.anchorTxId ? {
        txId: transfer.anchorTxId,
        status: transfer.anchorStatus,
        interactiveUrl: transfer.anchorInteractiveUrl,
        paymentTxHash: transfer.anchorPaymentTxHash,
      } : null,
    };
  });

  app.patch("/api/recurring/:recurringId", authed, async (req, reply) => {
    const { recurringId } = req.params as { recurringId: string };
    const existing = await getRecurringById(recurringId);
    if (!existing || existing.senderId !== req.user.senderId) { reply.code(404); return { error: { code: "NOT_FOUND", message: "jadwal tidak ditemukan" } }; }
    const body = req.body as Partial<{ recipientPhone: string; corridor: Corridor; amountForeign: string; dayOfMonth: number }>;
    const patch: Partial<{ recipientPhone: string; corridor: Corridor; amountForeign: string; dayOfMonth: number }> = {};
    if (body.recipientPhone !== undefined) {
      if (!E164.test(body.recipientPhone)) return badRequest(reply, "recipientPhone harus format E.164");
      patch.recipientPhone = body.recipientPhone;
    }
    if (body.corridor !== undefined) {
      if (body.corridor !== "MY" && body.corridor !== "HK") return badRequest(reply, "corridor harus MY|HK");
      patch.corridor = body.corridor;
    }
    if (body.amountForeign !== undefined) {
      if (!Number.isFinite(Number(body.amountForeign)) || Number(body.amountForeign) <= 0) return badRequest(reply, "amountForeign tidak valid");
      patch.amountForeign = body.amountForeign;
    }
    if (body.dayOfMonth !== undefined) {
      if (!Number.isInteger(body.dayOfMonth) || body.dayOfMonth < 1 || body.dayOfMonth > 28) return badRequest(reply, "dayOfMonth harus 1..28");
      patch.dayOfMonth = body.dayOfMonth;
    }
    if (Object.keys(patch).length === 0) return badRequest(reply, "tidak ada perubahan yang valid");
    await updateRecurring(recurringId, patch);
    const updated = { ...existing, ...patch };
    return { recurringId, recipientMasked: maskPhone(updated.recipientPhone), corridor: updated.corridor, amountForeign: updated.amountForeign, dayOfMonth: updated.dayOfMonth, status: updated.status, nextRunAt: nextRunAt(updated.dayOfMonth) };
  });

  for (const action of ["pause", "resume"] as const) {
    app.post(`/api/recurring/:recurringId/${action}`, authed, async (req, reply) => {
      const { recurringId } = req.params as { recurringId: string };
      const existing = await getRecurringById(recurringId);
      if (!existing || existing.senderId !== req.user.senderId) { reply.code(404); return { error: { code: "NOT_FOUND", message: "jadwal tidak ditemukan" } }; }
      const status = action === "pause" ? "PAUSED" : "ACTIVE";
      await updateRecurring(recurringId, { status });
      return { recurringId, status };
    });
  }

  app.delete("/api/recurring/:recurringId", authed, async (req, reply) => {
    const { recurringId } = req.params as { recurringId: string };
    const existing = await getRecurringById(recurringId);
    if (!existing || existing.senderId !== req.user.senderId) { reply.code(404); return { error: { code: "NOT_FOUND", message: "jadwal tidak ditemukan" } }; }
    await deleteRecurring(recurringId);
    reply.code(204);
  });
}
