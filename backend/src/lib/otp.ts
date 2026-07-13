// Pengiriman & verifikasi OTP — klaim (keyed token) dan auth pengirim (keyed phoneHmac).
// Provider: "mock" (demo) atau "twilio" (Verify API via fetch).
import { createHash, randomInt } from "node:crypto";
import { saveOtp, consumeOtp, saveAuthOtp, consumeAuthOtp } from "./db.js";

const OTP_PROVIDER = process.env.OTP_PROVIDER ?? "mock";
const OTP_TTL_SEC = 5 * 60;
const DEV_CODE = "123456"; // kode tetap untuk demo hackathon (mode mock saja)

function sha256(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

function twilioCreds(): { basicAuth: string; verifySid: string } {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const verifySid = process.env.TWILIO_VERIFY_SID;
  if (!sid || !authToken || !verifySid) {
    throw new Error("Konfigurasi Twilio tidak lengkap (TWILIO_ACCOUNT_SID/AUTH_TOKEN/VERIFY_SID)");
  }
  return { basicAuth: Buffer.from(`${sid}:${authToken}`).toString("base64"), verifySid };
}

async function twilioSend(phoneE164: string): Promise<{ sent: true }> {
  const { basicAuth, verifySid } = twilioCreds();
  const res = await fetch(`https://verify.twilio.com/v2/Services/${verifySid}/Verifications`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basicAuth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ To: phoneE164, Channel: "sms" }),
  });
  if (!res.ok) throw new Error(`Twilio kirim OTP gagal: ${res.status}`);
  return { sent: true };
}

async function twilioCheck(phoneE164: string, code: string): Promise<boolean> {
  const { basicAuth, verifySid } = twilioCreds();
  const res = await fetch(`https://verify.twilio.com/v2/Services/${verifySid}/VerificationCheck`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basicAuth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ To: phoneE164, Code: code }),
  });
  if (!res.ok) return false;
  const data = (await res.json()) as { status?: string };
  return data.status === "approved";
}

function newMockCode(): { code: string; codeHash: string } {
  const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
  return { code, codeHash: sha256(code) };
}

export async function sendOtp(token: string, phoneE164: string): Promise<{ sent: true }> {
  if (OTP_PROVIDER === "twilio") return twilioSend(phoneE164);

  // Mode mock: generate 6 digit, simpan hash-nya, log ke console untuk demo.
  const { code, codeHash } = newMockCode();
  await saveOtp(token, codeHash, Math.floor(Date.now() / 1000) + OTP_TTL_SEC);
  console.log(`[OTP mock] token=${token} phone=${phoneE164} code=${code}`);
  return { sent: true };
}

export async function verifyOtpCode(token: string, phoneE164: string, code: string): Promise<boolean> {
  if (OTP_PROVIDER === "twilio") return twilioCheck(phoneE164, code);

  // Mode mock: terima kode dev tetap, atau cocokkan hash via consumeOtp.
  const now = Math.floor(Date.now() / 1000);
  if (code === DEV_CODE) return true;
  return consumeOtp(token, sha256(code), now);
}

// ── OTP auth pengirim (daftar/recovery) — keyed phoneHmac, tabel auth_otps ──
export async function sendAuthOtp(phoneHmac: string, phoneE164: string): Promise<{ sent: true }> {
  if (OTP_PROVIDER === "twilio") return twilioSend(phoneE164);

  const { code, codeHash } = newMockCode();
  await saveAuthOtp(phoneHmac, codeHash, Math.floor(Date.now() / 1000) + OTP_TTL_SEC);
  console.log(`[OTP auth mock] phone=${phoneE164} code=${code}`);
  return { sent: true };
}

export async function verifyAuthOtpCode(phoneHmac: string, phoneE164: string, code: string): Promise<boolean> {
  if (OTP_PROVIDER === "twilio") return twilioCheck(phoneE164, code);

  const now = Math.floor(Date.now() / 1000);
  if (code === DEV_CODE) return true;
  return consumeAuthOtp(phoneHmac, sha256(code), now);
}
