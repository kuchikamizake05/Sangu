// Klien escrow Soroban — STUB.
// Sambungkan ke ESCROW_ID setelah tim contract deploy (Spike 1 & 3 dulu).
// Interface = docs spec §2.1.
import crypto from "node:crypto";

// Kunci rahasia backend untuk komitmen penerima (HMAC). WAJIB diset di .env, jangan hardcode.
const COMMITMENT_KEY = process.env.COMMITMENT_KEY ?? "dev-only-change-me";

/**
 * Buat secret + hashlock untuk sebuah transfer.
 * PENTING: `secret` DISIMPAN backend, TIDAK PERNAH ditaruh di URL/link.
 * Link claim hanya membawa `token` opaque (lihat spec §2.2).
 */
export function newSecret() {
  const secret = crypto.randomBytes(32);
  const hashlock = crypto.createHash("sha256").update(secret).digest();
  return { secret, hashlock };
}

/**
 * Komitmen penerima untuk disimpan on-chain — HMAC server-side, TIDAK dapat direkonstruksi
 * publik (beda dari sha256(nomor) yang brute-force-able). Bukan untuk auth on-chain; pencocokan
 * nomor dilakukan backend saat OTP. Tambahkan nonce acak per-transfer untuk memperkuat.
 */
export function recipientCommitment(e164: string, nonce: Buffer): Buffer {
  return crypto.createHmac("sha256", COMMITMENT_KEY).update(e164).update(nonce).digest();
}

// ── NON-CUSTODIAL: backend TIDAK memegang key pengirim & TIDAK membelanjakan dananya. ──
// Alur deposit = 2 langkah (spec §2.3):
//   1) prepareDeposit(): backend SUSUN transaksi (XDR) invoke `deposit`, kembalikan unsigned XDR.
//   2) passkey smart wallet di frontend meng-AUTHORIZE/sign → submitDeposit(signedXDR).
// Fee ditanggung relayer via fee-bump saat submit.

export interface PrepareDepositParams {
  senderAddress: string; // passkey smart wallet (C...) — pemilik dana
  amount: string; // USDC stroops
  hashlock: Buffer; // 32 byte
  recipientCommitment: Buffer; // 32 byte (HMAC)
  expiry: number; // unix seconds
}

// TODO(Spike 1): bangun tx invoke `deposit` (butuh auth sender), simulasikan via Soroban RPC,
// kembalikan XDR unsigned untuk di-authorize passkey wallet.
export async function prepareDeposit(_p: PrepareDepositParams): Promise<{ unsignedXDR: string }> {
  throw new Error("TODO: bangun XDR deposit unsigned untuk di-sign passkey (Spike 1)");
}

// TODO: bungkus fee-bump (RELAYER_SECRET) + submit signedXDR via Soroban RPC; kembalikan escrowId dari event.
export async function submitDeposit(_signedXDR: string): Promise<{ escrowId: string; txHash: string }> {
  throw new Error("TODO: fee-bump + submit signed deposit");
}

// claim dipanggil backend PASCA-OTP. destination = SETTLEMENT account (di-allowlist),
// lalu backend menjembatani ke anchor SEP-24 dgn memo. claim tak butuh auth pengirim
// (keamanan = secret + allowlist), jadi relayer boleh submit. Ini bagian dari
// batas OFF-RAMP yang bersifat trusted/custodial (lihat spec §2.5).
export async function claim(_escrowId: string, _secret: Buffer, _settlement: string): Promise<{ txHash: string }> {
  throw new Error("TODO: sambungkan ke contract claim (Spike 3)");
}

// keeper memanggil saat expiry lewat; permissionless, dana hanya ke sender.
export async function refund(_escrowId: string): Promise<{ txHash: string }> {
  throw new Error("TODO: sambungkan ke contract refund");
}
