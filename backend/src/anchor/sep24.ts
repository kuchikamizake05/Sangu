// Jembatan cash-out via anchor SEP-24 (SDF Test Anchor).
// Alur REAL: SEP-10 auth -> mulai interactive withdraw -> anchor beri akun tujuan + memo ->
// backend bayar via transaksi Classic Stellar ber-memo dari akun settlement.
// Protokol SEP-24/SEP-10 di sini nyata; settlement fiat IDR-nya disimulasikan oleh test anchor.
//
// WRINKLE MEMO (lihat docs spec §4): transfer Soroban (invoke contract) TIDAK bisa membawa
// memo Stellar classic. Karena itu escrow.claim mengirim USDC ke akun SETTLEMENT (custodial,
// classic account) dulu, baru dari akun settlement inilah backend membayar anchor DENGAN memo
// (Operation.payment classic bisa membawa Memo). Pola "settlement account" ini yang menjembatani
// keterbatasan tsb.
import {
  Asset,
  Horizon,
  Keypair,
  Memo,
  Networks,
  Operation,
  TransactionBuilder,
} from "@stellar/stellar-sdk";
import crypto from "node:crypto";

const ANCHOR_HOME_DOMAIN = process.env.ANCHOR_HOME_DOMAIN ?? "";
const ANCHOR_SEP10_URL_ENV = process.env.ANCHOR_SEP10_URL ?? "";
const ANCHOR_SEP24_URL_ENV = process.env.ANCHOR_SEP24_URL ?? "";
const SETTLEMENT_SECRET = process.env.SETTLEMENT_SECRET ?? "";
const HORIZON_URL = process.env.HORIZON_URL ?? "https://horizon-testnet.stellar.org";
const NETWORK_PASSPHRASE = process.env.NETWORK_PASSPHRASE ?? Networks.TESTNET;
const USDC_ASSET_CODE = process.env.USDC_ASSET_CODE ?? "USDC";
const USDC_ISSUER = process.env.USDC_ISSUER ?? "";

const PLACEHOLDER_ADDRESS = "GDEMO000000000000000000000000000000000000000000000000000";

/**
 * Anchor dianggap aktif bila home domain (atau kedua URL SEP-10/SEP-24) DAN
 * SETTLEMENT_SECRET terisi. Bila tidak, semua fungsi jalan dalam mode simulasi
 * tanpa panggilan jaringan.
 */
export function isAnchorEnabled(): boolean {
  const hasEndpoints = Boolean(ANCHOR_HOME_DOMAIN) || Boolean(ANCHOR_SEP10_URL_ENV && ANCHOR_SEP24_URL_ENV);
  return hasEndpoints && Boolean(SETTLEMENT_SECRET);
}

function settlementKeypair(): Keypair | null {
  if (!SETTLEMENT_SECRET) return null;
  try {
    return Keypair.fromSecret(SETTLEMENT_SECRET);
  } catch {
    throw new Error("SETTLEMENT_SECRET tidak valid — gagal membuat keypair settlement");
  }
}

/** Public key (G...) akun settlement. Placeholder bila SETTLEMENT_SECRET kosong. */
export function settlementAddress(): string {
  const kp = settlementKeypair();
  return kp ? kp.publicKey() : PLACEHOLDER_ADDRESS;
}

// ── Resolusi endpoint via stellar.toml (bila ANCHOR_SEP10_URL/ANCHOR_SEP24_URL tak diset) ──

let tomlCache: { webAuth: string; sep24: string } | null = null;

async function resolveEndpoints(): Promise<{ webAuth: string; sep24: string }> {
  if (ANCHOR_SEP10_URL_ENV && ANCHOR_SEP24_URL_ENV) {
    return { webAuth: ANCHOR_SEP10_URL_ENV, sep24: ANCHOR_SEP24_URL_ENV };
  }
  if (tomlCache) return tomlCache;
  if (!ANCHOR_HOME_DOMAIN) {
    throw new Error("Resolusi stellar.toml gagal: ANCHOR_HOME_DOMAIN tidak diset");
  }
  try {
    const res = await fetch(`https://${ANCHOR_HOME_DOMAIN}/.well-known/stellar.toml`);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const text = await res.text();
    const webAuth = ANCHOR_SEP10_URL_ENV || extractTomlValue(text, "WEB_AUTH_ENDPOINT");
    const sep24 = ANCHOR_SEP24_URL_ENV || extractTomlValue(text, "TRANSFER_SERVER_SEP0024");
    if (!webAuth || !sep24) {
      throw new Error("field WEB_AUTH_ENDPOINT/TRANSFER_SERVER_SEP0024 tidak ditemukan di stellar.toml");
    }
    tomlCache = { webAuth, sep24 };
    return tomlCache;
  } catch (err) {
    throw new Error(`Gagal resolve stellar.toml dari ${ANCHOR_HOME_DOMAIN}: ${(err as Error).message}`);
  }
}

// Parser TOML minimal: cukup ambil baris "KEY = \"value\"".
function extractTomlValue(toml: string, key: string): string {
  const re = new RegExp(`^${key}\\s*=\\s*"([^"]*)"`, "m");
  const m = toml.match(re);
  return m?.[1] ?? "";
}

// ── SEP-10 auth, dengan cache JWT ~5 menit ──

let jwtCache: { token: string; expiresAt: number } | null = null;

async function getSep10Jwt(): Promise<string> {
  if (jwtCache && jwtCache.expiresAt > Date.now()) {
    return jwtCache.token;
  }
  const kp = settlementKeypair();
  if (!kp) {
    throw new Error("SEP-10 auth gagal: SETTLEMENT_SECRET tidak diset");
  }
  const { webAuth } = await resolveEndpoints();

  let challengeJson: { transaction?: string; network_passphrase?: string };
  try {
    const challengeUrl = new URL(webAuth);
    challengeUrl.searchParams.set("account", kp.publicKey());
    if (ANCHOR_HOME_DOMAIN) challengeUrl.searchParams.set("home_domain", ANCHOR_HOME_DOMAIN);
    const res = await fetch(challengeUrl.toString());
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    challengeJson = (await res.json()) as typeof challengeJson;
  } catch (err) {
    throw new Error(`SEP-10 gagal mengambil challenge transaction: ${(err as Error).message}`);
  }

  if (!challengeJson.transaction) {
    throw new Error("SEP-10 gagal: response challenge tidak berisi field 'transaction'");
  }

  let signedXdr: string;
  try {
    const passphrase = challengeJson.network_passphrase ?? NETWORK_PASSPHRASE;
    const tx = TransactionBuilder.fromXDR(challengeJson.transaction, passphrase);
    tx.sign(kp);
    signedXdr = tx.toXDR();
  } catch (err) {
    throw new Error(`SEP-10 gagal menandatangani challenge transaction: ${(err as Error).message}`);
  }

  try {
    const res = await fetch(webAuth, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transaction: signedXdr }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = (await res.json()) as { token?: string };
    if (!json.token) throw new Error("response tidak berisi field 'token'");
    jwtCache = { token: json.token, expiresAt: Date.now() + 5 * 60 * 1000 };
    return json.token;
  } catch (err) {
    throw new Error(`SEP-10 gagal menukar signed challenge dengan JWT: ${(err as Error).message}`);
  }
}

// ── SEP-24 interactive withdraw ──

export interface WithdrawStart {
  anchorTxId: string;
  interactiveUrl: string;
  simulated: boolean;
  /** Jumlah yang benar-benar dipakai withdraw (setelah clamp limit anchor). */
  amountUsdc: string;
}

// Limit withdraw anchor (dari GET {sep24}/info), dicache per proses.
let withdrawLimitCache: { min: number; max: number } | null = null;

async function getWithdrawLimits(): Promise<{ min: number; max: number }> {
  if (withdrawLimitCache) return withdrawLimitCache;
  const { sep24 } = await resolveEndpoints();
  try {
    const res = await fetch(`${sep24}/info`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = (await res.json()) as {
      withdraw?: Record<string, { min_amount?: number; max_amount?: number }>;
    };
    const asset = json.withdraw?.[USDC_ASSET_CODE];
    withdrawLimitCache = {
      min: asset?.min_amount ?? 0,
      max: asset?.max_amount ?? Number.POSITIVE_INFINITY,
    };
  } catch {
    // /info gagal → jangan blokir withdraw, pakai limit longgar
    withdrawLimitCache = { min: 0, max: Number.POSITIVE_INFINITY };
  }
  return withdrawLimitCache;
}

/**
 * Jumlah dikirim ke anchor di-clamp ke [min, max] milik anchor. SDF Test Anchor
 * membatasi USDC max 10 per withdraw — untuk demo, kelebihan tetap di akun settlement
 * (produksi: pecah beberapa withdrawal / pakai anchor dengan limit riil).
 */
export async function startWithdraw(amountUsdc: string): Promise<WithdrawStart> {
  if (!isAnchorEnabled()) {
    return {
      anchorTxId: `SIM-${crypto.randomBytes(8).toString("hex")}`,
      interactiveUrl: "",
      simulated: true,
      amountUsdc,
    };
  }

  const jwt = await getSep10Jwt();
  const { sep24 } = await resolveEndpoints();
  const kp = settlementKeypair()!;

  const { min, max } = await getWithdrawLimits();
  const clamped = Math.min(Math.max(Number(amountUsdc), min), max);
  amountUsdc = clamped.toFixed(2);

  try {
    const res = await fetch(`${sep24}/transactions/withdraw/interactive`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${jwt}`,
      },
      body: JSON.stringify({
        asset_code: USDC_ASSET_CODE,
        amount: amountUsdc,
        account: kp.publicKey(),
      }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = (await res.json()) as { id?: string; url?: string };
    if (!json.id || !json.url) {
      throw new Error("response tidak berisi field 'id'/'url'");
    }
    return { anchorTxId: json.id, interactiveUrl: json.url, simulated: false, amountUsdc };
  } catch (err) {
    throw new Error(`SEP-24 gagal memulai interactive withdraw: ${(err as Error).message}`);
  }
}

// ── SEP-24 cek status transaksi withdraw ──

export interface WithdrawInfo {
  status: string;
  withdrawAnchorAccount?: string;
  withdrawMemo?: string;
  withdrawMemoType?: string;
}

export async function getWithdrawInfo(anchorTxId: string): Promise<WithdrawInfo> {
  if (!isAnchorEnabled() || anchorTxId.startsWith("SIM-")) {
    return { status: "pending_user_transfer_start" };
  }

  const jwt = await getSep10Jwt();
  const { sep24 } = await resolveEndpoints();

  try {
    const url = new URL(`${sep24}/transaction`);
    url.searchParams.set("id", anchorTxId);
    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${jwt}` },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = (await res.json()) as {
      transaction?: {
        status?: string;
        withdraw_anchor_account?: string;
        withdraw_memo?: string;
        withdraw_memo_type?: string;
      };
    };
    const t = json.transaction;
    if (!t?.status) throw new Error("response tidak berisi field 'transaction.status'");
    return {
      status: t.status,
      withdrawAnchorAccount: t.withdraw_anchor_account,
      withdrawMemo: t.withdraw_memo,
      withdrawMemoType: t.withdraw_memo_type,
    };
  } catch (err) {
    throw new Error(`SEP-24 gagal mengambil status transaksi (${anchorTxId}): ${(err as Error).message}`);
  }
}

// ── Pembayaran classic Stellar ber-memo dari akun settlement ke akun anchor ──

function buildMemo(memo: string, memoType: string): Memo {
  switch (memoType) {
    case "id":
      return Memo.id(memo);
    case "hash":
      return Memo.hash(Buffer.from(memo, "base64"));
    case "text":
    default:
      return Memo.text(memo);
  }
}

export async function payAnchorWithMemo(
  destination: string,
  amountUsdc: string,
  memo: string,
  memoType: string = "text",
): Promise<{ txHash: string }> {
  if (!isAnchorEnabled()) {
    return { txHash: `SIMULATED-${crypto.randomBytes(8).toString("hex")}` };
  }

  const kp = settlementKeypair()!;
  const server = new Horizon.Server(HORIZON_URL);

  try {
    const account = await server.loadAccount(kp.publicKey());
    const asset = new Asset(USDC_ASSET_CODE, USDC_ISSUER || undefined);
    const baseFee = await server.fetchBaseFee();
    const tx = new TransactionBuilder(account, {
      fee: String(baseFee),
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(
        Operation.payment({
          destination,
          asset,
          amount: amountUsdc,
        }),
      )
      .addMemo(buildMemo(memo, memoType))
      .setTimeout(60)
      .build();
    tx.sign(kp);
    const result = await server.submitTransaction(tx);
    return { txHash: result.hash };
  } catch (err) {
    throw new Error(`Gagal membayar anchor via Horizon (payment classic ber-memo): ${(err as Error).message}`);
  }
}
