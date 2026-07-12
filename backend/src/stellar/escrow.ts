// Klien escrow Soroban — STUB.
// Sambungkan ke ESCROW_ID setelah tim contract deploy (Spike 1 & 3 dulu).
// Interface = docs spec §2.1.
import crypto from "node:crypto";

export interface DepositParams {
  senderAddress: string; // passkey smart wallet (C...) atau akun biasa (fallback Spike 1)
  amount: string; // USDC stroops
  hashlock: Buffer; // sha256(secret), 32 byte
  phoneHash: Buffer; // sha256(E.164), 32 byte
  expiry: number; // unix seconds
}

/** Buat secret + hashlock untuk sebuah transfer. secret DISIMPAN backend, tak di URL. */
export function newSecret() {
  const secret = crypto.randomBytes(32);
  const hashlock = crypto.createHash("sha256").update(secret).digest();
  return { secret, hashlock };
}

export function phoneHash(e164: string): Buffer {
  return crypto.createHash("sha256").update(e164).digest();
}

// TODO(Spike 1): susun tx invoke `deposit`, minta auth dari passkey wallet,
// bungkus fee-bump/relayer (RELAYER_SECRET), submit via Soroban RPC.
export async function deposit(_p: DepositParams): Promise<{ escrowId: string; txHash: string }> {
  throw new Error("TODO: sambungkan ke contract deposit (Spike 1)");
}

// TODO: dipanggil pasca-OTP. destination = SETTLEMENT account (di-allowlist), lalu jembatan SEP-24.
export async function claim(_escrowId: string, _secret: Buffer, _destination: string): Promise<{ txHash: string }> {
  throw new Error("TODO: sambungkan ke contract claim");
}

// TODO: keeper memanggil saat expiry lewat.
export async function refund(_escrowId: string): Promise<{ txHash: string }> {
  throw new Error("TODO: sambungkan ke contract refund");
}
