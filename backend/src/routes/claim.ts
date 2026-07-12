// Rute sisi penerima (spec §2.3). Akses via token link (tanpa login).
// OTP = gerbang manusia; secret dipegang backend, diungkap ke contract saat claim.
import type { FastifyInstance } from "fastify";
import type { ClaimInfo, PayoutRequest, PayoutResponse } from "../lib/types.js";

export default async function claimRoutes(app: FastifyInstance) {
  app.get("/api/claim/:token", async (req): Promise<ClaimInfo> => {
    const { token } = req.params as { token: string };
    // TODO: lookup mapping token -> transfer; jangan bocorkan secret/escrowId
    void token;
    return {
      senderName: "Andi",
      amountIdr: "1720000",
      corridor: "MY",
      status: "PENDING",
    };
  });

  app.post("/api/claim/:token/otp/request", async () => {
    // TODO: kirim OTP ke nomor penerima (Twilio Verify / mock)
    return { sent: true };
  });

  app.post("/api/claim/:token/otp/verify", async (req) => {
    const { code } = req.body as { code: string };
    // TODO: verifikasi OTP + cocokkan phone_hash; keluarkan claimSession
    void code;
    return { ok: true, claimSession: crypto.randomUUID() };
  });

  app.post("/api/claim/:token/payout", async (req): Promise<PayoutResponse> => {
    const body = req.body as PayoutRequest;
    // TODO: SEP-24 withdraw (SDF Test Anchor) -> destination settlement account
    //       -> escrow.claim(escrowId, secret, settlement) -> jembatan ber-memo ke anchor (Spike 3)
    if (body.method === "cash") {
      return { status: "PAID_OUT", cashCode: "MG-8842-1177", instructions: "Tunjukkan kode + KTP di gerai." };
    }
    return { status: "PAID_OUT", instructions: `Dana dikirim ke ${body.method}.` };
  });
}
