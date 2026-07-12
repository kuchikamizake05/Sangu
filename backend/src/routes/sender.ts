// Rute sisi pengirim (spec §2.3). Implementasi STUB — bentuk benar supaya frontend jalan paralel.
//
// NON-CUSTODIAL (review #3): backend TIDAK memegang key pengirim & TIDAK membelanjakan dananya.
// Kirim = 2 langkah:
//   1) POST /api/send/prepare  → backend susun XDR `deposit` unsigned + simpan secret di DB
//   2) frontend: passkey wallet meng-authorize/sign XDR
//   3) POST /api/send/submit   → backend fee-bump + submit signed XDR
import crypto from "node:crypto";
import type { FastifyInstance } from "fastify";
import { getQuote } from "../lib/fx.js";
import { newSecret, recipientCommitment } from "../stellar/escrow.js";
import type {
  Corridor,
  PrepareSendRequest,
  PrepareSendResponse,
  SubmitSendRequest,
  SubmitSendResponse,
} from "../lib/types.js";

const BASE = process.env.PUBLIC_BASE_URL ?? "http://localhost:3000";

export default async function senderRoutes(app: FastifyInstance) {
  app.get("/api/quote", async (req) => {
    const { corridor, amountForeign } = req.query as { corridor: Corridor; amountForeign: string };
    return getQuote(corridor, Number(amountForeign));
  });

  // Langkah 1 — siapkan deposit (XDR unsigned untuk di-sign passkey wallet).
  app.post("/api/send/prepare", async (req): Promise<PrepareSendResponse> => {
    const body = req.body as PrepareSendRequest;
    const quote = await getQuote(body.corridor, Number(body.amountForeign));
    const expiry = Math.floor(Date.now() / 1000) + 72 * 3600;

    const transferId = crypto.randomUUID();
    const { secret, hashlock } = newSecret();
    const nonce = crypto.randomBytes(16);
    const commitment = recipientCommitment(body.recipientPhone, nonce);

    // TODO: simpan {transferId, secret, hashlock, commitment, nonce, phone, quote, status:PENDING} di DB.
    //       secret & phone TIDAK pernah dikirim ke frontend.
    void secret; void hashlock; void commitment;

    // TODO(Spike 1): prepareDeposit({senderAddress, amount, hashlock, recipientCommitment, expiry})
    const unsignedXDR = "TODO_UNSIGNED_XDR";
    return { transferId, unsignedXDR, quote, expiry };
  });

  // Langkah 2 — submit XDR yang sudah di-sign passkey wallet.
  app.post("/api/send/submit", async (req): Promise<SubmitSendResponse> => {
    const body = req.body as SubmitSendRequest;
    // TODO(Spike 1): submitDeposit(signedXDR) via relayer fee-bump → escrowId dari event.
    void body.signedXDR;
    const token = crypto.randomUUID(); // token OPAQUE — bukan secret
    return {
      transferId: body.transferId,
      escrowId: "TODO",
      claimUrl: `${BASE}/claim/${token}`,
    };
  });

  app.get("/api/transfers", async () => {
    // TODO: baca riwayat pengirim dari DB
    return [];
  });

  app.post("/api/recurring", async () => {
    // TODO: Sangu Bulanan — simpan jadwal; scheduler menyiapkan prepare tiap dayOfMonth
    // (tetap butuh sign passkey; untuk auto penuh perlu sesi/otorisasi terbatas — catat di roadmap).
    return { recurringId: crypto.randomUUID() };
  });
}
