// Plugin auth pengirim: JWT session (30 hari) + decorator `authenticate` untuk
// melindungi route sender. Lihat docs/auth-pengirim-pembagian-kerja-fe-be.md §2-3.
import { createHmac } from "node:crypto";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import fastifyJwt from "@fastify/jwt";

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: { senderId: string };
    user: { senderId: string };
  }
}

declare module "fastify" {
  interface FastifyInstance {
    authenticate: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

export const SESSION_TTL = "30d";

// Fallback dev supaya server tetap hidup tanpa .env lengkap — JANGAN dipakai produksi.
function jwtSecret(): string {
  const secret = process.env.AUTH_JWT_SECRET;
  if (secret) return secret;
  console.warn("[auth] AUTH_JWT_SECRET belum diset — memakai secret dev (hanya untuk lokal/demo)");
  return "sangu-dev-jwt-secret";
}

export async function registerAuth(app: FastifyInstance): Promise<void> {
  await app.register(fastifyJwt, { secret: jwtSecret(), sign: { expiresIn: SESSION_TTL } });

  app.decorate("authenticate", async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      await req.jwtVerify();
    } catch {
      reply.code(401);
      await reply.send({ error: { code: "UNAUTHORIZED", message: "sesi tidak valid — login dulu" } });
    }
  });
}

/** Lookup nomor HP selalu via HMAC (spek utama §2.2) — plaintext tidak dipakai sebagai key. */
export function phoneHmac(phoneE164: string): string {
  const key = process.env.PHONE_HMAC_KEY ?? "sangu-dev-phone-hmac";
  return createHmac("sha256", key).update(phoneE164).digest("hex");
}

/** Masking nomor HP untuk respons API — jangan bocorkan nomor penuh. */
export function maskPhone(e164: string): string {
  return e164.slice(0, 6) + "•••" + e164.slice(-2);
}
