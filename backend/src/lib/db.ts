// Persistensi Postgres (Supabase) via `pg`. Semua fungsi async.
// Menyimpan mapping token<->escrow, secret, status transfer, OTP, dan jadwal recurring.
import pg from "pg";
import { randomUUID } from "node:crypto";

export type TransferStatus = "PENDING" | "CLAIMED" | "PAID_OUT" | "REFUNDED" | "EXPIRED";
export type TransferEventType = "CREATED" | "DEPOSITED" | "CLAIMED" | "PAID_OUT" | "REFUNDED" | "EXPIRED";

export interface TransferEvent {
  type: TransferEventType;
  occurredAt: number;
}

export interface TransferRecord {
  transferId: string;
  token: string;
  escrowId: string | null;
  status: TransferStatus;
  corridor: "MY" | "HK";
  amountForeign: string;
  amountUsdcStroops: string;
  amountIdr: string;
  rate: string;
  secretHex: string;
  hashlockHex: string;
  commitmentHex: string;
  nonceHex: string;
  phoneE164: string;
  senderId: string | null; // pemilik transfer — null hanya untuk data lama pra-auth
  senderAddress: string | null;
  senderName: string;
  expiry: number;
  depositTxHash: string | null;
  claimTxHash: string | null;
  payoutMethod: string | null;
  cashCode: string | null;
  // Jembatan SEP-24 (hanya terisi untuk withdrawal anchor NYATA, bukan SIM-):
  anchorTxId: string | null;
  anchorStatus: string | null; // status terakhir dari anchor (incomplete, pending_user_transfer_start, ...)
  anchorAmountUsdc: string | null; // jumlah withdraw setelah clamp limit anchor
  anchorInteractiveUrl: string | null;
  anchorPaymentTxHash: string | null; // tx pembayaran memo settlement->anchor; non-null = sudah dibayar
  createdAt: number;
  updatedAt: number;
}

// Profil pengirim (auth) — lihat docs/auth-pengirim-pembagian-kerja-fe-be.md §3.1.
// Nomor HP dicari via HMAC (PHONE_HMAC_KEY); plaintext disimpan hanya untuk kirim OTP.
export interface SenderRecord {
  senderId: string;
  phoneHmac: string;
  phoneE164: string;
  name: string;
  passkeyCredentialId: string | null; // base64url credential id WebAuthn
  passkeyPublicKey: string | null; // base64url COSE public key
  passkeyCounter: number;
  walletAddress: string | null; // alamat smart wallet passkey (C.../G...)
  corridor?: "MY" | "HK" | null; // corridor pengirim; null/undefined → default MYR (lihat wallet.ts)
  createdAt: number;
}

// Saldo dompet demo (mock on-ramp) — nilai disimpan dalam mata uang corridor sender
// (MYR/HKD), string desimal (2 angka di belakang koma), konsisten dgn amountForeign di transfers.
export interface WalletBalanceRecord {
  senderId: string;
  corridor: "MY" | "HK";
  balanceForeign: string;
  updatedAt: number;
}

export interface RecurringRecord {
  recurringId: string;
  senderId: string | null;
  recipientPhone: string;
  corridor: "MY" | "HK";
  amountForeign: string;
  dayOfMonth: number;
  status: "ACTIVE" | "PAUSED";
  createdAt: number;
  lastTriggeredAt: number | null; // diisi scheduler saat jatuh tempo
  lastSentAt: number | null; // diisi saat pengirim menindaklanjuti (menutup siklus "due")
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString || !connectionString.startsWith("postgres")) {
  throw new Error("DATABASE_URL (postgres) wajib diset di .env");
}

// Pool singleton. Supabase pooler (pgbouncer, port 6543) butuh TLS; sertifikatnya
// tidak selalu tervalidasi chain lokal, jadi rejectUnauthorized: false (testnet/demo).
const pool = new pg.Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
  max: 5,
});

// Skema dibuat idempoten saat startup. Kolom camelCase dikutip agar identik
// dengan nama field TypeScript (tanpa lapisan mapping).
const SCHEMA_SQL = `
  CREATE TABLE IF NOT EXISTS transfers (
    "transferId" TEXT PRIMARY KEY,
    "token" TEXT UNIQUE NOT NULL,
    "escrowId" TEXT,
    "status" TEXT NOT NULL,
    "corridor" TEXT NOT NULL,
    "amountForeign" TEXT NOT NULL,
    "amountUsdcStroops" TEXT NOT NULL,
    "amountIdr" TEXT NOT NULL,
    "rate" TEXT NOT NULL,
    "secretHex" TEXT NOT NULL,
    "hashlockHex" TEXT NOT NULL,
    "commitmentHex" TEXT NOT NULL,
    "nonceHex" TEXT NOT NULL,
    "phoneE164" TEXT NOT NULL,
    "senderAddress" TEXT,
    "senderName" TEXT NOT NULL,
    "expiry" BIGINT NOT NULL,
    "depositTxHash" TEXT,
    "claimTxHash" TEXT,
    "payoutMethod" TEXT,
    "cashCode" TEXT,
    "anchorTxId" TEXT,
    "anchorStatus" TEXT,
    "anchorAmountUsdc" TEXT,
    "anchorInteractiveUrl" TEXT,
    "anchorPaymentTxHash" TEXT,
    "createdAt" BIGINT NOT NULL,
    "updatedAt" BIGINT NOT NULL
  );

  -- Migrasi idempoten untuk tabel yang sudah ada sebelum kolom anchor ditambahkan.
  ALTER TABLE transfers ADD COLUMN IF NOT EXISTS "anchorTxId" TEXT;
  ALTER TABLE transfers ADD COLUMN IF NOT EXISTS "anchorStatus" TEXT;
  ALTER TABLE transfers ADD COLUMN IF NOT EXISTS "anchorAmountUsdc" TEXT;
  ALTER TABLE transfers ADD COLUMN IF NOT EXISTS "anchorInteractiveUrl" TEXT;
  ALTER TABLE transfers ADD COLUMN IF NOT EXISTS "anchorPaymentTxHash" TEXT;

  CREATE TABLE IF NOT EXISTS otps (
    "token" TEXT PRIMARY KEY,
    "codeHash" TEXT NOT NULL,
    "expiresAt" BIGINT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS claim_sessions (
    "token" TEXT NOT NULL,
    "session" TEXT NOT NULL,
    "expiresAt" BIGINT NOT NULL,
    PRIMARY KEY ("token", "session")
  );

  CREATE TABLE IF NOT EXISTS recurring (
    "recurringId" TEXT PRIMARY KEY,
    "recipientPhone" TEXT NOT NULL,
    "corridor" TEXT NOT NULL,
    "amountForeign" TEXT NOT NULL,
    "dayOfMonth" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" BIGINT NOT NULL,
    "lastTriggeredAt" BIGINT
  );

  CREATE TABLE IF NOT EXISTS transfer_events (
    "transferId" TEXT NOT NULL REFERENCES transfers("transferId") ON DELETE CASCADE,
    "type" TEXT NOT NULL,
    "occurredAt" BIGINT NOT NULL,
    PRIMARY KEY ("transferId", "type")
  );

  ALTER TABLE recurring ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'ACTIVE';

  CREATE TABLE IF NOT EXISTS senders (
    "senderId"            TEXT PRIMARY KEY,
    "phoneHmac"           TEXT UNIQUE NOT NULL,
    "phoneE164"           TEXT NOT NULL,
    "name"                TEXT NOT NULL,
    "passkeyCredentialId" TEXT,
    "passkeyPublicKey"    TEXT,
    "passkeyCounter"      BIGINT NOT NULL DEFAULT 0,
    "walletAddress"       TEXT,
    "createdAt"           BIGINT NOT NULL
  );

  -- Corridor pengirim (MY|HK) untuk menentukan mata uang saldo dompet; NULL → default MYR.
  ALTER TABLE senders ADD COLUMN IF NOT EXISTS "corridor" TEXT;

  -- Saldo dompet demo (mock on-ramp) — 1 baris per sender, saldo dalam mata uang corridor.
  CREATE TABLE IF NOT EXISTS wallet_balances (
    "senderId"       TEXT PRIMARY KEY REFERENCES senders("senderId") ON DELETE CASCADE,
    "corridor"       TEXT NOT NULL,
    "balanceForeign" TEXT NOT NULL DEFAULT '0.00',
    "updatedAt"      BIGINT NOT NULL
  );

  -- OTP login/daftar pengirim; terpisah dari tabel "otps" milik alur claim.
  CREATE TABLE IF NOT EXISTS auth_otps (
    "phoneHmac" TEXT PRIMARY KEY,
    "codeHash"  TEXT NOT NULL,
    "expiresAt" BIGINT NOT NULL,
    "attempts"  INTEGER NOT NULL DEFAULT 0
  );

  -- Challenge WebAuthn sekali-pakai (registrasi & login passkey), TTL ~5 menit.
  CREATE TABLE IF NOT EXISTS auth_challenges (
    "challenge" TEXT PRIMARY KEY,
    "senderId"  TEXT,
    "expiresAt" BIGINT NOT NULL
  );

  ALTER TABLE transfers ADD COLUMN IF NOT EXISTS "senderId" TEXT;
  ALTER TABLE recurring ADD COLUMN IF NOT EXISTS "senderId" TEXT;
  ALTER TABLE recurring ADD COLUMN IF NOT EXISTS "lastSentAt" BIGINT;
`;

let schemaReady: Promise<void> | null = null;

function ensureSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = pool.query(SCHEMA_SQL).then(() => undefined);
  }
  return schemaReady!;
}

async function query(text: string, values: unknown[] = []): Promise<pg.QueryResult> {
  await ensureSchema();
  return pool.query(text, values);
}

export async function closeDb(): Promise<void> {
  await pool.end();
}

function nowSec(): number {
  return Math.floor(Date.now() / 1000);
}

// BIGINT dikembalikan pg sebagai string — paksa ke number di mapper.
function rowToTransfer(row: Record<string, unknown>): TransferRecord {
  return {
    transferId: row.transferId as string,
    token: row.token as string,
    escrowId: row.escrowId as string | null,
    status: row.status as TransferStatus,
    corridor: row.corridor as "MY" | "HK",
    amountForeign: row.amountForeign as string,
    amountUsdcStroops: row.amountUsdcStroops as string,
    amountIdr: row.amountIdr as string,
    rate: row.rate as string,
    secretHex: row.secretHex as string,
    hashlockHex: row.hashlockHex as string,
    commitmentHex: row.commitmentHex as string,
    nonceHex: row.nonceHex as string,
    phoneE164: row.phoneE164 as string,
    senderId: (row.senderId as string | null) ?? null,
    senderAddress: row.senderAddress as string | null,
    senderName: row.senderName as string,
    expiry: Number(row.expiry),
    depositTxHash: row.depositTxHash as string | null,
    claimTxHash: row.claimTxHash as string | null,
    payoutMethod: row.payoutMethod as string | null,
    cashCode: row.cashCode as string | null,
    anchorTxId: row.anchorTxId as string | null,
    anchorStatus: row.anchorStatus as string | null,
    anchorAmountUsdc: row.anchorAmountUsdc as string | null,
    anchorInteractiveUrl: row.anchorInteractiveUrl as string | null,
    anchorPaymentTxHash: row.anchorPaymentTxHash as string | null,
    createdAt: Number(row.createdAt),
    updatedAt: Number(row.updatedAt),
  };
}

// Kolom anchor tidak ikut di create — selalu NULL sampai payout memulai withdraw SEP-24.
export async function createTransfer(
  t: Omit<
    TransferRecord,
    | "createdAt"
    | "updatedAt"
    | "anchorTxId"
    | "anchorStatus"
    | "anchorAmountUsdc"
    | "anchorInteractiveUrl"
    | "anchorPaymentTxHash"
  >,
): Promise<void> {
  const ts = nowSec();
  await query(
    `
    INSERT INTO transfers (
      "transferId", "token", "escrowId", "status", "corridor",
      "amountForeign", "amountUsdcStroops", "amountIdr", "rate",
      "secretHex", "hashlockHex", "commitmentHex", "nonceHex",
      "phoneE164", "senderId", "senderAddress", "senderName", "expiry",
      "depositTxHash", "claimTxHash", "payoutMethod", "cashCode",
      "createdAt", "updatedAt"
    ) VALUES (
      $1, $2, $3, $4, $5,
      $6, $7, $8, $9,
      $10, $11, $12, $13,
      $14, $15, $16, $17, $18,
      $19, $20, $21, $22,
      $23, $24
    )
  `,
    [
      t.transferId, t.token, t.escrowId, t.status, t.corridor,
      t.amountForeign, t.amountUsdcStroops, t.amountIdr, t.rate,
      t.secretHex, t.hashlockHex, t.commitmentHex, t.nonceHex,
      t.phoneE164, t.senderId, t.senderAddress, t.senderName, t.expiry,
      t.depositTxHash, t.claimTxHash, t.payoutMethod, t.cashCode,
      ts, ts,
    ],
  );
}

export async function getTransferByToken(token: string): Promise<TransferRecord | undefined> {
  const res = await query(`SELECT * FROM transfers WHERE "token" = $1`, [token]);
  return res.rows[0] ? rowToTransfer(res.rows[0]) : undefined;
}

export async function getTransferById(transferId: string): Promise<TransferRecord | undefined> {
  const res = await query(`SELECT * FROM transfers WHERE "transferId" = $1`, [transferId]);
  return res.rows[0] ? rowToTransfer(res.rows[0]) : undefined;
}

// Kolom yang boleh diupdate (whitelist, mencegah SQL injection via key patch).
const TRANSFER_UPDATABLE_COLUMNS = new Set<string>([
  "token", "escrowId", "status", "corridor",
  "amountForeign", "amountUsdcStroops", "amountIdr", "rate",
  "secretHex", "hashlockHex", "commitmentHex", "nonceHex",
  "phoneE164", "senderAddress", "senderName", "expiry",
  "depositTxHash", "claimTxHash", "payoutMethod", "cashCode",
  "anchorTxId", "anchorStatus", "anchorAmountUsdc", "anchorInteractiveUrl", "anchorPaymentTxHash",
]);

export async function updateTransfer(
  transferId: string,
  patch: Partial<Omit<TransferRecord, "transferId" | "createdAt">>,
): Promise<void> {
  const keys = Object.keys(patch).filter((k) => TRANSFER_UPDATABLE_COLUMNS.has(k));
  if (keys.length === 0) return;

  const setClause = keys.map((k, i) => `"${k}" = $${i + 1}`).join(", ");
  const values = keys.map((k) => (patch as Record<string, unknown>)[k]);
  await query(
    `UPDATE transfers SET ${setClause}, "updatedAt" = $${keys.length + 1} WHERE "transferId" = $${keys.length + 2}`,
    [...values, nowSec(), transferId],
  );
}

export async function listTransfers(senderId: string): Promise<TransferRecord[]> {
  const res = await query(
    `SELECT * FROM transfers WHERE "senderId" = $1 ORDER BY "createdAt" DESC`,
    [senderId],
  );
  return res.rows.map(rowToTransfer);
}

// Withdrawal SEP-24 yang masih perlu dipantau: sudah punya anchorTxId, belum dibayar,
// dan status anchor terakhir belum terminal. Dipakai poller di scheduler.
// "interactive_expired" = status internal kita (bukan SEP-24): token interactive URL
// kedaluwarsa sebelum langkah interaktif selesai — mustahil dilanjutkan, berhenti retry.
const ANCHOR_TERMINAL_STATUSES = ["completed", "refunded", "expired", "error", "no_market", "interactive_expired"];

export async function listAnchorAwaitingPayment(): Promise<TransferRecord[]> {
  const res = await query(
    `SELECT * FROM transfers
     WHERE "anchorTxId" IS NOT NULL
       AND "anchorPaymentTxHash" IS NULL
       AND ("anchorStatus" IS NULL OR NOT ("anchorStatus" = ANY($1)))`,
    [ANCHOR_TERMINAL_STATUSES],
  );
  return res.rows.map(rowToTransfer);
}

export async function listExpiredPending(nowSecArg: number): Promise<TransferRecord[]> {
  const res = await query(
    `SELECT * FROM transfers WHERE "status" = 'PENDING' AND "expiry" <= $1`,
    [nowSecArg],
  );
  return res.rows.map(rowToTransfer);
}

// ── OTP: simpan hash kode, bukan plaintext ──
export async function saveOtp(token: string, codeHash: string, expiresAt: number): Promise<void> {
  await query(
    `
    INSERT INTO otps ("token", "codeHash", "expiresAt", "attempts") VALUES ($1, $2, $3, 0)
    ON CONFLICT ("token") DO UPDATE SET "codeHash" = $2, "expiresAt" = $3, "attempts" = 0
  `,
    [token, codeHash, expiresAt],
  );
}

export async function consumeOtp(token: string, codeHash: string, nowSecArg: number): Promise<boolean> {
  const res = await query(`SELECT * FROM otps WHERE "token" = $1`, [token]);
  const row = res.rows[0] as
    | { token: string; codeHash: string; expiresAt: string | number; attempts: number }
    | undefined;
  if (!row) return false;

  if (row.codeHash === codeHash && Number(row.expiresAt) > nowSecArg) {
    await query(`DELETE FROM otps WHERE "token" = $1`, [token]);
    return true;
  }

  const attempts = row.attempts + 1;
  if (attempts >= 5) {
    await query(`DELETE FROM otps WHERE "token" = $1`, [token]);
  } else {
    await query(`UPDATE otps SET "attempts" = $1 WHERE "token" = $2`, [attempts, token]);
  }
  return false;
}

// ── Sesi claim pasca-OTP ──
export async function createClaimSession(token: string, ttlSec = 900): Promise<string> {
  const session = randomUUID();
  const expiresAt = nowSec() + ttlSec;
  await query(
    `INSERT INTO claim_sessions ("token", "session", "expiresAt") VALUES ($1, $2, $3)`,
    [token, session, expiresAt],
  );
  return session;
}

export async function validateClaimSession(token: string, session: string): Promise<boolean> {
  const res = await query(
    `SELECT "expiresAt" FROM claim_sessions WHERE "token" = $1 AND "session" = $2`,
    [token, session],
  );
  const row = res.rows[0] as { expiresAt: string | number } | undefined;
  if (!row) return false;
  return Number(row.expiresAt) > nowSec();
}

// ── Sangu Bulanan (recurring) ──
export async function createRecurring(r: Omit<RecurringRecord, "createdAt" | "lastTriggeredAt" | "lastSentAt" | "status">): Promise<void> {
  await query(
    `
    INSERT INTO recurring ("recurringId", "senderId", "recipientPhone", "corridor", "amountForeign", "dayOfMonth", "status", "createdAt", "lastTriggeredAt")
    VALUES ($1, $2, $3, $4, $5, $6, 'ACTIVE', $7, NULL)
  `,
    [r.recurringId, r.senderId, r.recipientPhone, r.corridor, r.amountForeign, r.dayOfMonth, nowSec()],
  );
}

function rowToRecurring(row: Record<string, unknown>): RecurringRecord {
  return {
    recurringId: row.recurringId as string,
    senderId: (row.senderId as string | null) ?? null,
    recipientPhone: row.recipientPhone as string,
    corridor: row.corridor as "MY" | "HK",
    amountForeign: row.amountForeign as string,
    dayOfMonth: Number(row.dayOfMonth),
    status: row.status as "ACTIVE" | "PAUSED",
    createdAt: Number(row.createdAt),
    lastTriggeredAt: row.lastTriggeredAt == null ? null : Number(row.lastTriggeredAt),
    lastSentAt: row.lastSentAt == null ? null : Number(row.lastSentAt),
  };
}

export async function listRecurring(senderId: string): Promise<RecurringRecord[]> {
  const res = await query(
    `SELECT * FROM recurring WHERE "senderId" = $1 ORDER BY "createdAt" DESC`,
    [senderId],
  );
  return res.rows.map(rowToRecurring);
}

export async function recordTransferEvent(transferId: string, type: TransferEventType): Promise<void> {
  await query(
    `INSERT INTO transfer_events ("transferId", "type", "occurredAt") VALUES ($1, $2, $3) ON CONFLICT ("transferId", "type") DO NOTHING`,
    [transferId, type, nowSec()],
  );
}

export async function listTransferEvents(transferId: string): Promise<TransferEvent[]> {
  const res = await query(`SELECT "type", "occurredAt" FROM transfer_events WHERE "transferId" = $1 ORDER BY "occurredAt" ASC`, [transferId]);
  return res.rows.map((row) => ({ type: row.type as TransferEventType, occurredAt: Number(row.occurredAt) }));
}

export async function getRecurringById(recurringId: string): Promise<RecurringRecord | undefined> {
  const res = await query(`SELECT * FROM recurring WHERE "recurringId" = $1`, [recurringId]);
  return res.rows[0] ? rowToRecurring(res.rows[0]) : undefined;
}

const RECURRING_UPDATABLE_COLUMNS = new Set(["recipientPhone", "corridor", "amountForeign", "dayOfMonth", "status"]);

export async function updateRecurring(recurringId: string, patch: Partial<Pick<RecurringRecord, "recipientPhone" | "corridor" | "amountForeign" | "dayOfMonth" | "status">>): Promise<void> {
  const keys = Object.keys(patch).filter((key) => RECURRING_UPDATABLE_COLUMNS.has(key));
  if (keys.length === 0) return;
  const values = keys.map((key) => (patch as Record<string, unknown>)[key]);
  await query(`UPDATE recurring SET ${keys.map((key, index) => `"${key}" = $${index + 1}`).join(", ")} WHERE "recurringId" = $${keys.length + 1}`, [...values, recurringId]);
}

export async function deleteRecurring(recurringId: string): Promise<void> {
  await query(`DELETE FROM recurring WHERE "recurringId" = $1`, [recurringId]);
}

const TWENTY_DAYS_SEC = 20 * 24 * 60 * 60;

export async function listRecurringDue(dayOfMonth: number, nowSecArg: number): Promise<RecurringRecord[]> {
  const cutoff = nowSecArg - TWENTY_DAYS_SEC;
  const res = await query(
    `SELECT * FROM recurring WHERE "status" = 'ACTIVE' AND "dayOfMonth" = $1 AND ("lastTriggeredAt" IS NULL OR "lastTriggeredAt" < $2)`,
    [dayOfMonth, cutoff],
  );
  return res.rows.map(rowToRecurring);
}

export async function markRecurringTriggered(recurringId: string, ts: number): Promise<void> {
  await query(`UPDATE recurring SET "lastTriggeredAt" = $1 WHERE "recurringId" = $2`, [ts, recurringId]);
}

/** Pengirim menindaklanjuti siklus yang jatuh tempo (kirim / tutup banner) → dueNow padam. */
export async function markRecurringSent(recurringId: string, ts: number): Promise<void> {
  await query(`UPDATE recurring SET "lastSentAt" = $1 WHERE "recurringId" = $2`, [ts, recurringId]);
}

// ── Senders (auth pengirim) ──
function rowToSender(row: Record<string, unknown>): SenderRecord {
  return {
    senderId: row.senderId as string,
    phoneHmac: row.phoneHmac as string,
    phoneE164: row.phoneE164 as string,
    name: row.name as string,
    passkeyCredentialId: row.passkeyCredentialId as string | null,
    passkeyPublicKey: row.passkeyPublicKey as string | null,
    passkeyCounter: Number(row.passkeyCounter ?? 0),
    walletAddress: row.walletAddress as string | null,
    corridor: (row.corridor as "MY" | "HK" | null) ?? null,
    createdAt: Number(row.createdAt),
  };
}

export async function createSender(s: Omit<SenderRecord, "createdAt">): Promise<void> {
  await query(
    `
    INSERT INTO senders ("senderId", "phoneHmac", "phoneE164", "name",
      "passkeyCredentialId", "passkeyPublicKey", "passkeyCounter", "walletAddress", "createdAt")
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
  `,
    [s.senderId, s.phoneHmac, s.phoneE164, s.name, s.passkeyCredentialId, s.passkeyPublicKey, s.passkeyCounter, s.walletAddress, nowSec()],
  );
}

export async function getSenderById(senderId: string): Promise<SenderRecord | undefined> {
  const res = await query(`SELECT * FROM senders WHERE "senderId" = $1`, [senderId]);
  return res.rows[0] ? rowToSender(res.rows[0]) : undefined;
}

export async function getSenderByPhoneHmac(phoneHmac: string): Promise<SenderRecord | undefined> {
  const res = await query(`SELECT * FROM senders WHERE "phoneHmac" = $1`, [phoneHmac]);
  return res.rows[0] ? rowToSender(res.rows[0]) : undefined;
}

const SENDER_UPDATABLE_COLUMNS = new Set([
  "name", "passkeyCredentialId", "passkeyPublicKey", "passkeyCounter", "walletAddress", "corridor",
]);

export async function updateSender(
  senderId: string,
  patch: Partial<Pick<SenderRecord, "name" | "passkeyCredentialId" | "passkeyPublicKey" | "passkeyCounter" | "walletAddress" | "corridor">>,
): Promise<void> {
  const keys = Object.keys(patch).filter((k) => SENDER_UPDATABLE_COLUMNS.has(k));
  if (keys.length === 0) return;
  const values = keys.map((k) => (patch as Record<string, unknown>)[k]);
  await query(
    `UPDATE senders SET ${keys.map((k, i) => `"${k}" = $${i + 1}`).join(", ")} WHERE "senderId" = $${keys.length + 1}`,
    [...values, senderId],
  );
}

// ── OTP auth pengirim: pola sama dengan otps (hash kode, max 5 percobaan) ──
export async function saveAuthOtp(phoneHmac: string, codeHash: string, expiresAt: number): Promise<void> {
  await query(
    `
    INSERT INTO auth_otps ("phoneHmac", "codeHash", "expiresAt", "attempts") VALUES ($1, $2, $3, 0)
    ON CONFLICT ("phoneHmac") DO UPDATE SET "codeHash" = $2, "expiresAt" = $3, "attempts" = 0
  `,
    [phoneHmac, codeHash, expiresAt],
  );
}

export async function consumeAuthOtp(phoneHmac: string, codeHash: string, nowSecArg: number): Promise<boolean> {
  const res = await query(`SELECT * FROM auth_otps WHERE "phoneHmac" = $1`, [phoneHmac]);
  const row = res.rows[0] as
    | { phoneHmac: string; codeHash: string; expiresAt: string | number; attempts: number }
    | undefined;
  if (!row) return false;

  if (row.codeHash === codeHash && Number(row.expiresAt) > nowSecArg) {
    await query(`DELETE FROM auth_otps WHERE "phoneHmac" = $1`, [phoneHmac]);
    return true;
  }

  const attempts = row.attempts + 1;
  if (attempts >= 5) {
    await query(`DELETE FROM auth_otps WHERE "phoneHmac" = $1`, [phoneHmac]);
  } else {
    await query(`UPDATE auth_otps SET "attempts" = $1 WHERE "phoneHmac" = $2`, [attempts, phoneHmac]);
  }
  return false;
}

// ── Challenge WebAuthn sekali-pakai ──
export async function saveAuthChallenge(challenge: string, senderId: string | null, ttlSec = 300): Promise<void> {
  await query(
    `INSERT INTO auth_challenges ("challenge", "senderId", "expiresAt") VALUES ($1, $2, $3)`,
    [challenge, senderId, nowSec() + ttlSec],
  );
}

/** Ambil + hapus challenge (sekali pakai). Mengembalikan senderId terkait bila masih berlaku. */
export async function consumeAuthChallenge(
  challenge: string,
): Promise<{ ok: boolean; senderId: string | null }> {
  const res = await query(
    `DELETE FROM auth_challenges WHERE "challenge" = $1 RETURNING "senderId", "expiresAt"`,
    [challenge],
  );
  const row = res.rows[0] as { senderId: string | null; expiresAt: string | number } | undefined;
  if (!row || Number(row.expiresAt) <= nowSec()) return { ok: false, senderId: null };
  return { ok: true, senderId: row.senderId };
}

// ── Saldo dompet demo (mock on-ramp, wallet.ts) ──
function rowToWalletBalance(row: Record<string, unknown>): WalletBalanceRecord {
  return {
    senderId: row.senderId as string,
    corridor: row.corridor as "MY" | "HK",
    balanceForeign: row.balanceForeign as string,
    updatedAt: Number(row.updatedAt),
  };
}

/** Ambil saldo dompet sender; bila belum ada baris, buat baru dengan saldo 0.00. */
export async function getOrCreateWalletBalance(
  senderId: string,
  corridor: "MY" | "HK",
): Promise<WalletBalanceRecord> {
  const existing = await query(`SELECT * FROM wallet_balances WHERE "senderId" = $1`, [senderId]);
  if (existing.rows[0]) return rowToWalletBalance(existing.rows[0]);

  const ts = nowSec();
  await query(
    `
    INSERT INTO wallet_balances ("senderId", "corridor", "balanceForeign", "updatedAt")
    VALUES ($1, $2, '0.00', $3)
    ON CONFLICT ("senderId") DO NOTHING
  `,
    [senderId, corridor, ts],
  );
  const res = await query(`SELECT * FROM wallet_balances WHERE "senderId" = $1`, [senderId]);
  return rowToWalletBalance(res.rows[0]);
}

/** Set saldo dompet sender ke nilai baru (string desimal, mis. hasil top-up). */
export async function setWalletBalance(
  senderId: string,
  corridor: "MY" | "HK",
  balanceForeign: string,
): Promise<void> {
  const ts = nowSec();
  await query(
    `
    INSERT INTO wallet_balances ("senderId", "corridor", "balanceForeign", "updatedAt")
    VALUES ($1, $2, $3, $4)
    ON CONFLICT ("senderId")
    DO UPDATE SET "corridor" = $2, "balanceForeign" = $3, "updatedAt" = $4
  `,
    [senderId, corridor, balanceForeign, ts],
  );
}
