// Klien escrow Soroban.
// Interface = docs spec §2.1. Contract: contracts/escrow/src/lib.rs.
import crypto from "node:crypto";
import {
  rpc,
  TransactionBuilder,
  FeeBumpTransaction,
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
  // PENTING: cloneFrom TIDAK membawa sorobanData (ext) — wajib di-set ulang eksplisit,
  // kalau tidak tx jadi txMalformed (soroban op tanpa sorobanTransactionData).
  const margin = 200_000n;
  const sorobanData = assembled.toEnvelope().v1().tx().ext().sorobanData();
  sorobanData.resourceFee(
    xdr.Int64.fromString((BigInt(sorobanData.resourceFee().toString()) + margin).toString()),
  );
  const bumpedFee = (BigInt(assembled.fee) + margin).toString();
  const bumped = TransactionBuilder.cloneFrom(assembled, { fee: bumpedFee, sorobanData }).build();

  return { unsignedXDR: bumped.toXDR() };
}

export async function submitDeposit(signedXDR: string): Promise<{ escrowId: string; txHash: string }> {
  const { relayer } = requireOnchain();
  const srv = server();

  const incoming = TransactionBuilder.fromXDR(signedXDR, networkPassphrase());
  if (incoming instanceof FeeBumpTransaction) throw new Error("signedXDR harus transaksi biasa, bukan fee-bump");

  // Dua alasan envelope prepare TIDAK bisa dipakai apa adanya:
  // 1. Sequence relayer bisa basi saat user selesai tanda tangan (akun relayer juga dipakai
  //    keeper/scheduler) → txBadSeq.
  // 2. Footprint hasil simulasi prepare direkam TANPA menjalankan __check_auth (auth entry
  //    belum ditandatangani saat itu) → storage signer passkey tidak ter-footprint →
  //    "access outside of the footprint" saat apply.
  // Tanda tangan passkey menempel di AUTH ENTRY Soroban (nonce + expiration ledger), bukan di
  // envelope — jadi aman: bangun ulang envelope dengan sequence segar, bawa operasi (berikut
  // auth ter-tanda-tangan), lalu RE-SIMULASI supaya footprint + resource fee dihitung penuh.
  const rawOp = incoming.toEnvelope().v1().tx().operations()[0];

  const relayerAccount = await srv.getAccount(relayer.publicKey());
  const rebuilt = new TransactionBuilder(relayerAccount, {
    fee: BASE_FEE,
    networkPassphrase: networkPassphrase(),
  })
    .addOperation(rawOp)
    .setTimeout(300)
    .build();

  const sim = await srv.simulateTransaction(rebuilt);
  if (rpc.Api.isSimulationError(sim)) {
    throw new Error(`re-simulasi deposit gagal: ${formatSimError(sim)}`);
  }
  const tx = rpc.assembleTransaction(rebuilt, sim).build();

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

// ── Helper SAC USDC: baca saldo & on-ramp (transfer dari akun settlement/treasury). ──

function usdcSacId(): string {
  const id = process.env.USDC_SAC;
  if (!id) throw new Error("USDC_SAC belum diset di .env");
  return id;
}

/** Saldo USDC sebuah address (G... atau C...) dalam stroops, via simulasi read-only `balance`. */
export async function getUsdcBalanceStroops(address: string): Promise<bigint> {
  const { relayer } = requireOnchain();
  const srv = server();
  const contract = new Contract(usdcSacId());
  const source = await srv.getAccount(relayer.publicKey());

  const tx = new TransactionBuilder(source, { fee: BASE_FEE, networkPassphrase: networkPassphrase() })
    .addOperation(contract.call("balance", new Address(address).toScVal()))
    .setTimeout(60)
    .build();

  const sim = await srv.simulateTransaction(tx);
  if (rpc.Api.isSimulationError(sim)) throw new Error(`baca saldo USDC gagal: ${formatSimError(sim)}`);
  const retval = (sim as rpc.Api.SimulateTransactionSuccessResponse).result?.retval;
  return retval ? BigInt(scValToNative(retval) as bigint) : 0n;
}

/**
 * On-ramp MOCK-tapi-on-chain (docs §14.7): kirim USDC testnet sungguhan dari akun SETTLEMENT
 * (berperan sebagai treasury on-ramp demo) ke smart wallet sender. Settlement = source &
 * penandatangan, jadi require_auth `from` terpenuhi lewat source-account auth.
 */
export async function transferUsdcFromTreasury(destination: string, stroops: bigint): Promise<{ txHash: string }> {
  const secret = process.env.SETTLEMENT_SECRET;
  if (!secret) throw new Error("SETTLEMENT_SECRET belum diset — treasury on-ramp tidak tersedia");
  const settlement = Keypair.fromSecret(secret);
  const srv = server();
  const contract = new Contract(usdcSacId());

  const op = contract.call(
    "transfer",
    new Address(settlement.publicKey()).toScVal(),
    new Address(destination).toScVal(),
    nativeToScVal(stroops, { type: "i128" }),
  );

  return runRelayerOnlyOp(srv, settlement, op);
}

// Deploy smart wallet passkey (setup pertama): frontend mengirim tx deploy yang sudah
// ditandatangani passkey-kit (source = akun seed internal kit, BUKAN akun kita); relayer
// membungkusnya fee-bump supaya fee dibayar relayer, lalu submit. Idempoten: kontrak
// yang sudah ter-deploy (retry) diperlakukan sukses.
export async function submitWalletDeploy(signedXDR: string): Promise<{ txHash: string | null }> {
  const { relayer } = requireOnchain();
  const srv = server();

  const inner = TransactionBuilder.fromXDR(signedXDR, networkPassphrase());
  if (inner instanceof FeeBumpTransaction) throw new Error("signedTx harus transaksi biasa, bukan fee-bump");

  // Param baseFee = fee per operasi utk envelope fee-bump; wajib menutup fee inner
  // (termasuk resource fee Soroban) — beri margin supaya tidak txInsufficientFee.
  const feePerOp = (BigInt(inner.fee) + 200_000n).toString();
  const bump = TransactionBuilder.buildFeeBumpTransaction(relayer, feePerOp, inner, networkPassphrase());
  bump.sign(relayer);

  const sendRes = await srv.sendTransaction(bump);
  if (sendRes.status === "ERROR") {
    const detail = JSON.stringify(sendRes.errorResult ?? {});
    if (/exist/i.test(detail)) return { txHash: null }; // sudah ter-deploy — anggap sukses
    throw new Error(`submit deploy wallet gagal: ${detail}`);
  }

  try {
    await pollTransaction(srv, sendRes.hash);
  } catch (err) {
    if (!/exist/i.test(String(err))) throw err;
  }
  return { txHash: sendRes.hash };
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
