// Klien escrow Soroban.
// Interface = docs spec §2.1. Contract: contracts/escrow/src/lib.rs.
import crypto from "node:crypto";
import {
  rpc,
  TransactionBuilder,
  BASE_FEE,
  Contract,
  Keypair,
  nativeToScVal,
  scValToNative,
  xdr,
  Address,
} from "@stellar/stellar-sdk";

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
// Relayer bertindak sebagai source account (bayar fee) tapi tidak pernah memegang otorisasi
// pengeluaran dana sender — itu tetap milik `sender.require_auth()` di kontrak.

export interface PrepareDepositParams {
  senderAddress: string; // passkey smart wallet (C...) — pemilik dana
  amount: string; // USDC stroops
  hashlock: Buffer; // 32 byte
  recipientCommitment: Buffer; // 32 byte (HMAC)
  expiry: number; // unix seconds
}

// ── Konfigurasi (dibaca lazy, jangan crash saat import bila env kosong) ──────

function rpcUrl(): string {
  return process.env.RPC_URL ?? "https://soroban-testnet.stellar.org";
}

function networkPassphrase(): string {
  return process.env.NETWORK_PASSPHRASE ?? "Test SDF Network ; September 2015";
}

function escrowContractId(): string | undefined {
  return process.env.ESCROW_ID || undefined;
}

function relayerSecret(): string | undefined {
  return process.env.RELAYER_SECRET || undefined;
}

/** true bila ESCROW_ID dan RELAYER_SECRET terisi — dipakai pemanggil untuk memutuskan demo-mode. */
export function isOnchainEnabled(): boolean {
  return Boolean(escrowContractId() && relayerSecret());
}

function requireOnchain(): { contractId: string; relayer: Keypair } {
  const contractId = escrowContractId();
  const secret = relayerSecret();
  if (!contractId || !secret) {
    throw new Error("on-chain belum dikonfigurasi (ESCROW_ID/RELAYER_SECRET)");
  }
  return { contractId, relayer: Keypair.fromSecret(secret) };
}

function server(): rpc.Server {
  return new rpc.Server(rpcUrl());
}

function formatSimError(sim: rpc.Api.SimulateTransactionResponse): string {
  if (rpc.Api.isSimulationError(sim)) {
    return sim.error;
  }
  return JSON.stringify(sim);
}

// Poll getTransaction sampai SUCCESS/FAILED (interval 1 detik, timeout ~30 detik).
async function pollTransaction(srv: rpc.Server, hash: string): Promise<rpc.Api.GetTransactionResponse> {
  const timeoutMs = 30_000;
  const intervalMs = 1000;
  const start = Date.now();
  for (;;) {
    const res = await srv.getTransaction(hash);
    if (res.status !== rpc.Api.GetTransactionStatus.NOT_FOUND) {
      if (res.status === rpc.Api.GetTransactionStatus.FAILED) {
        throw new Error(`transaksi gagal on-chain: ${hash} — ${JSON.stringify(res)}`);
      }
      return res;
    }
    if (Date.now() - start > timeoutMs) {
      throw new Error(`timeout menunggu konfirmasi transaksi: ${hash}`);
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
}

// TODO(Spike 1): bangun tx invoke `deposit` (butuh auth sender), simulasikan via Soroban RPC,
// kembalikan XDR unsigned untuk di-authorize passkey wallet.
export async function prepareDeposit(p: PrepareDepositParams): Promise<{ unsignedXDR: string }> {
  const { contractId, relayer } = requireOnchain();
  const srv = server();
  const contract = new Contract(contractId);

  // Source account = akun RELAYER (relayer bayar fee), BUKAN akun sender.
  const relayerAccount = await srv.getAccount(relayer.publicKey());

  const op = contract.call(
    "deposit",
    new Address(p.senderAddress).toScVal(),
    nativeToScVal(BigInt(p.amount), { type: "i128" }),
    xdr.ScVal.scvBytes(p.hashlock),
    xdr.ScVal.scvBytes(p.recipientCommitment),
    nativeToScVal(BigInt(p.expiry), { type: "u64" }),
  );

  const tx = new TransactionBuilder(relayerAccount, {
    fee: BASE_FEE,
    networkPassphrase: networkPassphrase(),
  })
    .addOperation(op)
    .setTimeout(300)
    .build();

  const sim = await srv.simulateTransaction(tx);
  if (rpc.Api.isSimulationError(sim)) {
    throw new Error(`simulasi deposit gagal: ${formatSimError(sim)}`);
  }

  // sender.require_auth() di kontrak menghasilkan SorobanAuthorizationEntry untuk sender di
  // dalam hasil simulasi. Entry ini BELUM ditandatangani — frontend (passkey wallet) yang
  // akan menandatanganinya sebelum submitDeposit(). Kita hanya assemble resource footprint +
  // fee dari hasil simulasi, TIDAK menandatangani envelope di sini.
  const assembled = rpc.assembleTransaction(tx, sim).build();

  // Naikkan resource fee dgn margin supaya muat setelah signature auth entry ditambahkan.
  const margin = 200_000;
  const bumpedFee = (BigInt(assembled.fee) + BigInt(margin)).toString();
  const bumped = TransactionBuilder.cloneFrom(assembled, { fee: bumpedFee }).build();

  return { unsignedXDR: bumped.toXDR() };
}

// TODO: bungkus fee-bump (RELAYER_SECRET) + submit signedXDR via Soroban RPC; kembalikan escrowId dari event.
export async function submitDeposit(signedXDR: string): Promise<{ escrowId: string; txHash: string }> {
  const { relayer } = requireOnchain();
  const srv = server();

  const tx = TransactionBuilder.fromXDR(signedXDR, networkPassphrase());
  // Relayer menandatangani ENVELOPE (fee source); auth entry sender sudah ditandatangani
  // oleh passkey wallet sebelum dikirim ke sini.
  tx.sign(relayer);

  const sendRes = await srv.sendTransaction(tx);
  if (sendRes.status === "ERROR") {
    throw new Error(`submit deposit gagal: ${JSON.stringify(sendRes.errorResult)}`);
  }

  const getRes = await pollTransaction(srv, sendRes.hash);
  const escrowId =
    getRes.status === rpc.Api.GetTransactionStatus.SUCCESS && getRes.returnValue
      ? String(scValToNative(getRes.returnValue))
      : "";

  return { escrowId, txHash: sendRes.hash };
}

// claim dipanggil backend PASCA-OTP. destination = SETTLEMENT account (di-allowlist),
// lalu backend menjembatani ke anchor SEP-24 dgn memo. claim tak butuh auth pengirim
// (keamanan = secret + allowlist), jadi relayer boleh submit. Ini bagian dari
// batas OFF-RAMP yang bersifat trusted/custodial (lihat spec §2.5).
export async function claim(
  escrowId: string,
  secret: Buffer,
  settlementAddress: string,
): Promise<{ txHash: string }> {
  const { contractId, relayer } = requireOnchain();
  const srv = server();
  const contract = new Contract(contractId);

  const op = contract.call(
    "claim",
    nativeToScVal(BigInt(escrowId), { type: "u64" }),
    xdr.ScVal.scvBytes(secret),
    new Address(settlementAddress).toScVal(),
  );

  return runRelayerOnlyOp(srv, relayer, op);
}

// keeper memanggil saat expiry lewat; permissionless, dana hanya ke sender.
export async function refund(escrowId: string): Promise<{ txHash: string }> {
  const { contractId, relayer } = requireOnchain();
  const srv = server();
  const contract = new Contract(contractId);

  const op = contract.call("refund", nativeToScVal(BigInt(escrowId), { type: "u64" }));

  return runRelayerOnlyOp(srv, relayer, op);
}

// Helper: build → simulate → assemble → sign → send → poll, untuk operasi yang relayer
// jadi source DAN penandatangan (tak butuh auth pihak lain): claim & refund.
async function runRelayerOnlyOp(
  srv: rpc.Server,
  relayer: Keypair,
  op: xdr.Operation,
): Promise<{ txHash: string }> {
  const relayerAccount = await srv.getAccount(relayer.publicKey());

  const tx = new TransactionBuilder(relayerAccount, {
    fee: BASE_FEE,
    networkPassphrase: networkPassphrase(),
  })
    .addOperation(op)
    .setTimeout(300)
    .build();

  const sim = await srv.simulateTransaction(tx);
  if (rpc.Api.isSimulationError(sim)) {
    throw new Error(`simulasi gagal: ${formatSimError(sim)}`);
  }

  const assembled = rpc.assembleTransaction(tx, sim).build();
  assembled.sign(relayer);

  const sendRes = await srv.sendTransaction(assembled);
  if (sendRes.status === "ERROR") {
    throw new Error(`submit gagal: ${JSON.stringify(sendRes.errorResult)}`);
  }

  await pollTransaction(srv, sendRes.hash);
  return { txHash: sendRes.hash };
}
