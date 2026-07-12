// Persistensi SQLite via modul bawaan Node (node:sqlite) — tanpa dependency npm tambahan.
// Menyimpan mapping token<->escrow, secret, status transfer, OTP, dan jadwal recurring.
import { DatabaseSync } from "node:sqlite";
import { randomUUID } from "node:crypto";

export type TransferStatus = "PENDING" | "CLAIMED" | "PAID_OUT" | "REFUNDED" | "EXPIRED";

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
  senderAddress: string | null;
  senderName: string;
  expiry: number;
  depositTxHash: string | null;
  claimTxHash: string | null;
  payoutMethod: string | null;
  cashCode: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface RecurringRecord {
  recurringId: string;
  recipientPhone: string;
  corridor: "MY" | "HK";
  amountForeign: string;
  dayOfMonth: number;
  createdAt: number;
  lastTriggeredAt: number | null;
}

const dbUrl = process.env.DATABASE_URL ?? "file:./dev.db";
const dbPath = dbUrl.startsWith("file:") ? dbUrl.slice("file:".length) : dbUrl;

// Singleton koneksi DB untuk seluruh proses.
const db = new DatabaseSync(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS transfers (
    transferId TEXT PRIMARY KEY,
    token TEXT UNIQUE NOT NULL,
    escrowId TEXT,
    status TEXT NOT NULL,
    corridor TEXT NOT NULL,
    amountForeign TEXT NOT NULL,
    amountUsdcStroops TEXT NOT NULL,
    amountIdr TEXT NOT NULL,
    rate TEXT NOT NULL,
    secretHex TEXT NOT NULL,
    hashlockHex TEXT NOT NULL,
    commitmentHex TEXT NOT NULL,
    nonceHex TEXT NOT NULL,
    phoneE164 TEXT NOT NULL,
    senderAddress TEXT,
    senderName TEXT NOT NULL,
    expiry INTEGER NOT NULL,
    depositTxHash TEXT,
    claimTxHash TEXT,
    payoutMethod TEXT,
    cashCode TEXT,
    createdAt INTEGER NOT NULL,
    updatedAt INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS otps (
    token TEXT PRIMARY KEY,
    codeHash TEXT NOT NULL,
    expiresAt INTEGER NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS claim_sessions (
    token TEXT NOT NULL,
    session TEXT NOT NULL,
    expiresAt INTEGER NOT NULL,
    PRIMARY KEY (token, session)
  );

  CREATE TABLE IF NOT EXISTS recurring (
    recurringId TEXT PRIMARY KEY,
    recipientPhone TEXT NOT NULL,
    corridor TEXT NOT NULL,
    amountForeign TEXT NOT NULL,
    dayOfMonth INTEGER NOT NULL,
    createdAt INTEGER NOT NULL,
    lastTriggeredAt INTEGER
  );
`);

function nowSec(): number {
  return Math.floor(Date.now() / 1000);
}

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
    senderAddress: row.senderAddress as string | null,
    senderName: row.senderName as string,
    expiry: row.expiry as number,
    depositTxHash: row.depositTxHash as string | null,
    claimTxHash: row.claimTxHash as string | null,
    payoutMethod: row.payoutMethod as string | null,
    cashCode: row.cashCode as string | null,
    createdAt: row.createdAt as number,
    updatedAt: row.updatedAt as number,
  };
}

export function createTransfer(t: Omit<TransferRecord, "createdAt" | "updatedAt">): void {
  const ts = nowSec();
  const stmt = db.prepare(`
    INSERT INTO transfers (
      transferId, token, escrowId, status, corridor,
      amountForeign, amountUsdcStroops, amountIdr, rate,
      secretHex, hashlockHex, commitmentHex, nonceHex,
      phoneE164, senderAddress, senderName, expiry,
      depositTxHash, claimTxHash, payoutMethod, cashCode,
      createdAt, updatedAt
    ) VALUES (
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?
    )
  `);
  stmt.run(
    t.transferId, t.token, t.escrowId, t.status, t.corridor,
    t.amountForeign, t.amountUsdcStroops, t.amountIdr, t.rate,
    t.secretHex, t.hashlockHex, t.commitmentHex, t.nonceHex,
    t.phoneE164, t.senderAddress, t.senderName, t.expiry,
    t.depositTxHash, t.claimTxHash, t.payoutMethod, t.cashCode,
    ts, ts,
  );
}

export function getTransferByToken(token: string): TransferRecord | undefined {
  const row = db.prepare(`SELECT * FROM transfers WHERE token = ?`).get(token);
  return row ? rowToTransfer(row as Record<string, unknown>) : undefined;
}

export function getTransferById(transferId: string): TransferRecord | undefined {
  const row = db.prepare(`SELECT * FROM transfers WHERE transferId = ?`).get(transferId);
  return row ? rowToTransfer(row as Record<string, unknown>) : undefined;
}

// Kolom yang boleh diupdate (whitelist, mencegah SQL injection via key patch).
const TRANSFER_UPDATABLE_COLUMNS = new Set<string>([
  "token", "escrowId", "status", "corridor",
  "amountForeign", "amountUsdcStroops", "amountIdr", "rate",
  "secretHex", "hashlockHex", "commitmentHex", "nonceHex",
  "phoneE164", "senderAddress", "senderName", "expiry",
  "depositTxHash", "claimTxHash", "payoutMethod", "cashCode",
]);

export function updateTransfer(
  transferId: string,
  patch: Partial<Omit<TransferRecord, "transferId" | "createdAt">>,
): void {
  const keys = Object.keys(patch).filter((k) => TRANSFER_UPDATABLE_COLUMNS.has(k));
  if (keys.length === 0) return;

  const setClause = keys.map((k) => `${k} = ?`).join(", ");
  const values = keys.map((k) => (patch as Record<string, unknown>)[k]) as (string | number | null)[];
  const stmt = db.prepare(`UPDATE transfers SET ${setClause}, updatedAt = ? WHERE transferId = ?`);
  stmt.run(...values, nowSec(), transferId);
}

export function listTransfers(): TransferRecord[] {
  const rows = db.prepare(`SELECT * FROM transfers ORDER BY createdAt DESC`).all();
  return rows.map((r) => rowToTransfer(r as Record<string, unknown>));
}

export function listExpiredPending(nowSecArg: number): TransferRecord[] {
  const rows = db
    .prepare(`SELECT * FROM transfers WHERE status = 'PENDING' AND expiry <= ?`)
    .all(nowSecArg);
  return rows.map((r) => rowToTransfer(r as Record<string, unknown>));
}

// ── OTP: simpan hash kode, bukan plaintext ──
export function saveOtp(token: string, codeHash: string, expiresAt: number): void {
  db.prepare(`DELETE FROM otps WHERE token = ?`).run(token);
  db.prepare(`INSERT INTO otps (token, codeHash, expiresAt, attempts) VALUES (?, ?, ?, 0)`).run(
    token, codeHash, expiresAt,
  );
}

export function consumeOtp(token: string, codeHash: string, nowSecArg: number): boolean {
  const row = db.prepare(`SELECT * FROM otps WHERE token = ?`).get(token) as
    | { token: string; codeHash: string; expiresAt: number; attempts: number }
    | undefined;
  if (!row) return false;

  if (row.codeHash === codeHash && row.expiresAt > nowSecArg) {
    db.prepare(`DELETE FROM otps WHERE token = ?`).run(token);
    return true;
  }

  const attempts = row.attempts + 1;
  if (attempts >= 5) {
    db.prepare(`DELETE FROM otps WHERE token = ?`).run(token);
  } else {
    db.prepare(`UPDATE otps SET attempts = ? WHERE token = ?`).run(attempts, token);
  }
  return false;
}

// ── Sesi claim pasca-OTP ──
export function createClaimSession(token: string, ttlSec = 900): string {
  const session = randomUUID();
  const expiresAt = nowSec() + ttlSec;
  db.prepare(`INSERT INTO claim_sessions (token, session, expiresAt) VALUES (?, ?, ?)`).run(
    token, session, expiresAt,
  );
  return session;
}

export function validateClaimSession(token: string, session: string): boolean {
  const row = db
    .prepare(`SELECT expiresAt FROM claim_sessions WHERE token = ? AND session = ?`)
    .get(token, session) as { expiresAt: number } | undefined;
  if (!row) return false;
  return row.expiresAt > nowSec();
}

// ── Sangu Bulanan (recurring) ──
export function createRecurring(r: Omit<RecurringRecord, "createdAt" | "lastTriggeredAt">): void {
  const ts = nowSec();
  db.prepare(`
    INSERT INTO recurring (recurringId, recipientPhone, corridor, amountForeign, dayOfMonth, createdAt, lastTriggeredAt)
    VALUES (?, ?, ?, ?, ?, ?, NULL)
  `).run(r.recurringId, r.recipientPhone, r.corridor, r.amountForeign, r.dayOfMonth, ts);
}

function rowToRecurring(row: Record<string, unknown>): RecurringRecord {
  return {
    recurringId: row.recurringId as string,
    recipientPhone: row.recipientPhone as string,
    corridor: row.corridor as "MY" | "HK",
    amountForeign: row.amountForeign as string,
    dayOfMonth: row.dayOfMonth as number,
    createdAt: row.createdAt as number,
    lastTriggeredAt: row.lastTriggeredAt as number | null,
  };
}

export function listRecurring(): RecurringRecord[] {
  const rows = db.prepare(`SELECT * FROM recurring ORDER BY createdAt DESC`).all();
  return rows.map((r) => rowToRecurring(r as Record<string, unknown>));
}

const TWENTY_DAYS_SEC = 20 * 24 * 60 * 60;

export function listRecurringDue(dayOfMonth: number, nowSecArg: number): RecurringRecord[] {
  const cutoff = nowSecArg - TWENTY_DAYS_SEC;
  const rows = db
    .prepare(
      `SELECT * FROM recurring WHERE dayOfMonth = ? AND (lastTriggeredAt IS NULL OR lastTriggeredAt < ?)`,
    )
    .all(dayOfMonth, cutoff);
  return rows.map((r) => rowToRecurring(r as Record<string, unknown>));
}

export function markRecurringTriggered(recurringId: string, ts: number): void {
  db.prepare(`UPDATE recurring SET lastTriggeredAt = ? WHERE recurringId = ?`).run(ts, recurringId);
}
