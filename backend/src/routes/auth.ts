// Auth pengirim (docs/auth-pengirim-pembagian-kerja-fe-be.md §2).
// OTP hanya untuk daftar/recovery; login harian via passkey (WebAuthn) —
// credential yang sama dengan smart wallet, jadi user cuma kenal "sidik jari".
import crypto from "node:crypto";
import type { FastifyInstance, FastifyReply } from "fastify";
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
  type RegistrationResponseJSON,
  type AuthenticationResponseJSON,
} from "@simplewebauthn/server";
import {
  createSender,
  getSenderById,
  getSenderByPhoneHmac,
  updateSender,
  saveAuthChallenge,
  consumeAuthChallenge,
  type SenderRecord,
} from "../lib/db.js";
import { sendAuthOtp, verifyAuthOtpCode } from "../lib/otp.js";
import { phoneHmac, maskPhone } from "../lib/auth.js";

const E164 = /^\+[1-9]\d{6,14}$/;
const RP_NAME = "Sangu";
const RP_ID = process.env.AUTH_RP_ID ?? "localhost";
const ORIGIN = process.env.AUTH_ORIGIN ?? "http://localhost:3000";

// Rate limit OTP: max 3 request per menit per nomor (in-memory — cukup untuk 1 proses).
const otpRequestLog = new Map<string, number[]>();
function otpRateLimited(key: string): boolean {
  const now = Date.now();
  const recent = (otpRequestLog.get(key) ?? []).filter((t) => now - t < 60_000);
  if (recent.length >= 3) {
    otpRequestLog.set(key, recent);
    return true;
  }
  recent.push(now);
  otpRequestLog.set(key, recent);
  return false;
}

function badRequest(reply: FastifyReply, message: string) {
  reply.code(400);
  return { error: { code: "BAD_REQUEST", message } };
}

function senderView(s: SenderRecord) {
  return {
    senderId: s.senderId,
    name: s.name,
    phoneMasked: maskPhone(s.phoneE164),
    hasPasskey: Boolean(s.passkeyCredentialId),
  };
}

/** Challenge asli ada di clientDataJSON respons WebAuthn — dicocokkan ke DB (sekali pakai). */
function challengeFromClientData(response: { response: { clientDataJSON: string } }): string | null {
  try {
    const json = JSON.parse(Buffer.from(response.response.clientDataJSON, "base64url").toString("utf8"));
    return typeof json.challenge === "string" ? json.challenge : null;
  } catch {
    return null;
  }
}

export default async function authRoutes(app: FastifyInstance) {
  // ── Daftar / recovery via OTP ──
  app.post("/api/auth/otp/request", async (req, reply): Promise<unknown> => {
    const { phone } = req.body as { phone?: string };
    if (!E164.test(phone ?? "")) return badRequest(reply, "Nomor HP harus diawali kode negara, contoh +62…");
    const hmac = phoneHmac(phone!);
    if (otpRateLimited(hmac)) {
      reply.code(429);
      return { error: { code: "OTP_RATE_LIMITED", message: "Terlalu sering meminta kode. Tunggu sebentar lalu coba lagi." } };
    }
    return sendAuthOtp(hmac, phone!);
  });

  app.post("/api/auth/otp/verify", async (req, reply): Promise<unknown> => {
    const { phone, code, name } = req.body as { phone?: string; code?: string; name?: string };
    if (!E164.test(phone ?? "")) return badRequest(reply, "Nomor HP harus diawali kode negara, contoh +62…");
    const hmac = phoneHmac(phone!);
    const ok = await verifyAuthOtpCode(hmac, phone!, String(code ?? ""));
    if (!ok) {
      reply.code(401);
      return { error: { code: "OTP_INVALID", message: "Kode OTP salah atau kedaluwarsa." } };
    }

    let sender = await getSenderByPhoneHmac(hmac);
    if (!sender) {
      const trimmed = (name ?? "").trim();
      if (!trimmed) return badRequest(reply, "Isi nama dulu untuk pendaftaran pertama.");
      sender = {
        senderId: crypto.randomUUID(),
        phoneHmac: hmac,
        phoneE164: phone!,
        name: trimmed,
        passkeyCredentialId: null,
        passkeyPublicKey: null,
        passkeyCounter: 0,
        walletAddress: null,
        createdAt: Math.floor(Date.now() / 1000),
      };
      await createSender(sender);
    }

    const token = app.jwt.sign({ senderId: sender.senderId });
    return { token, sender: senderView(sender) };
  });

  // ── Registrasi passkey (setelah login — Bearer) ──
  app.post(
    "/api/auth/passkey/register/options",
    { preHandler: [app.authenticate] },
    async (req, reply): Promise<unknown> => {
      const sender = await getSenderById(req.user.senderId);
      if (!sender) {
        reply.code(401);
        return { error: { code: "UNAUTHORIZED", message: "Akun tidak ditemukan." } };
      }
      const options = await generateRegistrationOptions({
        rpName: RP_NAME,
        rpID: RP_ID,
        userName: sender.name,
        attestationType: "none",
        authenticatorSelection: { residentKey: "preferred", userVerification: "preferred" },
      });
      await saveAuthChallenge(options.challenge, sender.senderId);
      return options;
    },
  );

  app.post(
    "/api/auth/passkey/register/verify",
    { preHandler: [app.authenticate] },
    async (req, reply): Promise<unknown> => {
      const { attestation, walletAddress } = req.body as {
        attestation?: RegistrationResponseJSON;
        walletAddress?: string;
      };
      if (!attestation || !walletAddress) return badRequest(reply, "Data aktivasi sidik jari tidak lengkap. Coba lagi.");

      const challenge = attestation && challengeFromClientData(attestation);
      const consumed = challenge ? await consumeAuthChallenge(challenge) : { ok: false, senderId: null };
      if (!consumed.ok || consumed.senderId !== req.user.senderId) {
        reply.code(400);
        return { error: { code: "PASSKEY_INVALID", message: "Verifikasi kedaluwarsa. Coba lagi." } };
      }

      try {
        const { verified, registrationInfo } = await verifyRegistrationResponse({
          response: attestation,
          expectedChallenge: challenge!,
          expectedOrigin: ORIGIN,
          expectedRPID: RP_ID,
        });
        if (!verified || !registrationInfo) throw new Error("attestation tidak terverifikasi");
        await updateSender(req.user.senderId, {
          passkeyCredentialId: registrationInfo.credential.id,
          passkeyPublicKey: Buffer.from(registrationInfo.credential.publicKey).toString("base64url"),
          passkeyCounter: registrationInfo.credential.counter,
          walletAddress,
        });
        return { ok: true };
      } catch (err) {
        req.log.warn({ err }, "verifikasi registrasi passkey gagal");
        reply.code(400);
        return { error: { code: "PASSKEY_INVALID", message: "Sidik jari belum dapat diverifikasi. Coba lagi." } };
      }
    },
  );

  // ── Login harian via passkey ──
  app.post("/api/auth/passkey/login/options", async (req, reply): Promise<unknown> => {
    const { phone } = req.body as { phone?: string };
    if (!E164.test(phone ?? "")) return badRequest(reply, "Nomor HP harus diawali kode negara, contoh +62…");
    const sender = await getSenderByPhoneHmac(phoneHmac(phone!));
    if (!sender || !sender.passkeyCredentialId) {
      reply.code(404);
      return { error: { code: "SENDER_NOT_FOUND", message: "Akun atau sidik jari tidak ditemukan. Masuk dengan kode OTP dulu." } };
    }
    const options = await generateAuthenticationOptions({
      rpID: RP_ID,
      allowCredentials: [{ id: sender.passkeyCredentialId }],
      userVerification: "preferred",
    });
    await saveAuthChallenge(options.challenge, sender.senderId);
    return options;
  });

  app.post("/api/auth/passkey/login/verify", async (req, reply): Promise<unknown> => {
    const { phone, assertion } = req.body as { phone?: string; assertion?: AuthenticationResponseJSON };
    if (!E164.test(phone ?? "") || !assertion) return badRequest(reply, "Data masuk tidak lengkap. Coba lagi.");
    const sender = await getSenderByPhoneHmac(phoneHmac(phone!));
    if (!sender || !sender.passkeyCredentialId || !sender.passkeyPublicKey) {
      reply.code(404);
      return { error: { code: "SENDER_NOT_FOUND", message: "Akun atau sidik jari tidak ditemukan." } };
    }

    const challenge = challengeFromClientData(assertion);
    const consumed = challenge ? await consumeAuthChallenge(challenge) : { ok: false, senderId: null };
    if (!consumed.ok || consumed.senderId !== sender.senderId) {
      reply.code(401);
      return { error: { code: "PASSKEY_INVALID", message: "Verifikasi kedaluwarsa. Coba lagi." } };
    }

    try {
      const { verified, authenticationInfo } = await verifyAuthenticationResponse({
        response: assertion,
        expectedChallenge: challenge!,
        expectedOrigin: ORIGIN,
        expectedRPID: RP_ID,
        credential: {
          id: sender.passkeyCredentialId,
          publicKey: Buffer.from(sender.passkeyPublicKey, "base64url"),
          counter: sender.passkeyCounter,
        },
      });
      if (!verified) throw new Error("assertion tidak terverifikasi");
      await updateSender(sender.senderId, { passkeyCounter: authenticationInfo.newCounter });
      const token = app.jwt.sign({ senderId: sender.senderId });
      return { token, sender: senderView(sender) };
    } catch (err) {
      req.log.warn({ err }, "verifikasi login passkey gagal");
      reply.code(401);
      return { error: { code: "PASSKEY_INVALID", message: "Sidik jari belum dapat diverifikasi. Coba lagi." } };
    }
  });

  // ── Profil sesi ──
  app.get("/api/auth/me", { preHandler: [app.authenticate] }, async (req, reply): Promise<unknown> => {
    const sender = await getSenderById(req.user.senderId);
    if (!sender) {
      reply.code(401);
      return { error: { code: "UNAUTHORIZED", message: "Akun tidak ditemukan." } };
    }
    return { ...senderView(sender), walletAddress: sender.walletAddress };
  });
}
