// Rute sisi pengirim (spec §2.3). Implementasi STUB — kembalikan bentuk yang benar
// supaya frontend bisa dibangun paralel; sambungkan on-chain setelah Spike.
import type { FastifyInstance } from "fastify";
import { getQuote } from "../lib/fx.js";
import type { Corridor, SendRequest, SendResponse } from "../lib/types.js";

const BASE = process.env.PUBLIC_BASE_URL ?? "http://localhost:3000";

export default async function senderRoutes(app: FastifyInstance) {
  app.get("/api/quote", async (req) => {
    const { corridor, amountForeign } = req.query as {
      corridor: Corridor;
      amountForeign: string;
    };
    return getQuote(corridor, Number(amountForeign));
  });

  app.post("/api/send", async (req): Promise<SendResponse> => {
    const body = req.body as SendRequest;
    const quote = await getQuote(body.corridor, Number(body.amountForeign));
    const expiry = Math.floor(Date.now() / 1000) + 72 * 3600;

    // TODO: newSecret() + escrow.deposit() (Spike 1); simpan mapping token↔{escrowId,secret,phoneHash}
    const token = crypto.randomUUID();
    return {
      transferId: crypto.randomUUID(),
      escrowId: "TODO",
      claimUrl: `${BASE}/claim/${token}`,
      quote,
      expiry,
    };
  });

  app.get("/api/transfers", async () => {
    // TODO: baca dari DB (riwayat pengirim)
    return [];
  });

  app.post("/api/recurring", async () => {
    // TODO: Sangu Bulanan — simpan jadwal, scheduler kirim tiap dayOfMonth
    return { recurringId: crypto.randomUUID() };
  });
}
