// Klien REST ke backend (spec §2.3). Bentuk tipe cermin backend/src/lib/types.ts.
const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

import { clearAuthToken, getAuthToken } from "./auth-session";

async function authFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  const token = getAuthToken();
  if (token) headers.set("authorization", `Bearer ${token}`);
  const response = await fetch(`${BASE}${path}`, { ...init, headers });
  if (response.status === 401 && typeof window !== "undefined") {
    clearAuthToken();
    window.location.assign(`/login?next=${encodeURIComponent(window.location.pathname)}`);
  }
  return response;
}

export type Corridor = "MY" | "HK";
export type PayoutMethod = "dana" | "gopay" | "bank" | "cash";

export interface AuthSender {
  senderId: string;
  name: string;
  phoneMasked: string;
  hasPasskey: boolean;
}

export async function requestAuthOtp(phone: string): Promise<{ sent: true }> {
  const res = await fetch(`${BASE}/api/auth/otp/request`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ phone }) });
  if (!res.ok) throw new Error("Kode belum dapat dikirim. Coba lagi sebentar.");
  return res.json();
}

export async function verifyAuthOtp(phone: string, code: string, name?: string): Promise<{ token: string; sender: AuthSender }> {
  const res = await fetch(`${BASE}/api/auth/otp/verify`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ phone, code, ...(name ? { name } : {}) }) });
  if (!res.ok) throw new Error("Kode tidak cocok atau sudah kedaluwarsa.");
  return res.json();
}

export interface SenderProfile extends AuthSender { walletAddress: string | null; }
export function getMe(): Promise<SenderProfile> { return authFetch("/api/auth/me").then(async (res) => { if (!res.ok) throw new Error("Sesi tidak valid."); return res.json(); }); }
export function getPasskeyRegisterOptions() { return authFetch("/api/auth/passkey/register/options", { method: "POST" }).then(async (res) => { if (!res.ok) throw new Error("Sidik jari belum dapat disiapkan."); return res.json(); }); }
export function verifyPasskeyRegister(attestation: unknown, walletAddress: string): Promise<{ ok: true }> { return authFetch("/api/auth/passkey/register/verify", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ attestation, walletAddress }) }).then(async (res) => { if (!res.ok) throw new Error("Sidik jari belum dapat diaktifkan."); return res.json(); }); }
export function getPasskeyLoginOptions(phone: string) { return fetch(`${BASE}/api/auth/passkey/login/options`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ phone }) }).then(async (res) => { if (!res.ok) throw new Error("Akun atau sidik jari tidak ditemukan."); return res.json(); }); }
export function verifyPasskeyLogin(phone: string, assertion: unknown): Promise<{ token: string; sender: AuthSender }> { return fetch(`${BASE}/api/auth/passkey/login/verify`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ phone, assertion }) }).then(async (res) => { if (!res.ok) throw new Error("Sidik jari tidak dapat diverifikasi."); return res.json(); }); }

export interface Quote {
  rate: string;
  amountIdr: string;
  estimate: true;
  rateSource: string;
  rateAsOf: string;
  feeIdrEstimate: string;
  comparison: { westernUnionFeeIdrEstimate: string; note: string };
}

export async function getQuote(corridor: Corridor, amountForeign: string): Promise<Quote> {
  const res = await fetch(`${BASE}/api/quote?corridor=${corridor}&amountForeign=${amountForeign}`);
  return res.json();
}

export interface PrepareSendResponse {
  transferId: string;
  unsignedXDR: string;
  quote: Quote;
  expiry: number;
}

export interface SubmitSendResponse {
  transferId: string;
  escrowId: string;
  claimUrl: string;
}

export interface ClaimInfo {
  senderName: string;
  amountIdr: string;
  corridor: Corridor;
  status: "PENDING" | "CLAIMED" | "PAID_OUT" | "REFUNDED" | "EXPIRED";
}

export interface PayoutResponse {
  status: string;
  simulatedPayout?: boolean;
  cashCode?: string;
  instructions?: string;
  anchorTxId?: string;
  interactiveUrl?: string;
}

export interface TransferSummary {
  transferId: string;
  status: "PENDING" | "CLAIMED" | "PAID_OUT" | "REFUNDED" | "EXPIRED";
  amount: string;
  recipientMasked: string;
  createdAt: string;
}

export interface RecurringRequest {
  recipientPhone: string;
  corridor: Corridor;
  amountForeign: string;
  dayOfMonth: number;
}

export interface TransferDetail extends TransferSummary {
  corridor: Corridor;
  amountIdr: string;
  events: Array<{ type: "CREATED" | "DEPOSITED" | "CLAIMED" | "PAID_OUT" | "REFUNDED" | "EXPIRED"; occurredAt: string }>;
  anchor?: { txId: string; status: string | null; interactiveUrl: string | null; paymentTxHash: string | null } | null;
}

export interface RecurringSchedule {
  recurringId: string;
  recipientMasked: string;
  corridor: Corridor;
  amountForeign: string;
  dayOfMonth: number;
  status: "ACTIVE" | "PAUSED";
  nextRunAt: string;
}

export async function prepareSend(body: {
  corridor: Corridor;
  amountForeign: string;
  recipientPhone: string;
  methodHint?: PayoutMethod;
}) {
  const res = await authFetch(`/api/send/prepare`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("Transfer belum dapat disiapkan.");
  return res.json() as Promise<PrepareSendResponse>;
}

export async function submitSend(body: { transferId: string; signedXDR: string }) {
  const res = await authFetch(`/api/send/submit`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("Transaksi belum dapat dikirim.");
  return res.json() as Promise<SubmitSendResponse>;
}

export async function getTransfers(): Promise<TransferSummary[]> {
  const res = await authFetch(`/api/transfers`);
  if (!res.ok) throw new Error("Riwayat transfer belum dapat dimuat.");
  return res.json();
}

export async function createRecurring(body: RecurringRequest): Promise<{ recurringId: string }> {
  const res = await authFetch(`/api/recurring`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("Jadwal bulanan belum dapat disimpan.");
  return res.json();
}

export async function getTransferDetail(transferId: string): Promise<TransferDetail> {
  const res = await authFetch(`/api/transfers/${transferId}`);
  if (!res.ok) throw new Error("Detail transfer belum dapat dimuat.");
  return res.json();
}

async function recurringRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await authFetch(`/api/recurring${path}`, init);
  if (!res.ok) throw new Error("Jadwal bulanan belum dapat diperbarui.");
  return res.status === 204 ? undefined as T : res.json();
}

export function getRecurring(): Promise<RecurringSchedule[]> { return recurringRequest(""); }
export function updateRecurring(recurringId: string, body: Partial<RecurringRequest>): Promise<RecurringSchedule> { return recurringRequest(`/${recurringId}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }); }
export function setRecurringStatus(recurringId: string, action: "pause" | "resume"): Promise<{ recurringId: string; status: RecurringSchedule["status"] }> { return recurringRequest(`/${recurringId}/${action}`, { method: "POST" }); }
export function deleteRecurring(recurringId: string): Promise<void> { return recurringRequest(`/${recurringId}`, { method: "DELETE" }); }

export async function getClaim(token: string): Promise<ClaimInfo> {
  const res = await fetch(`${BASE}/api/claim/${token}`);
  if (!res.ok) throw new Error("Link claim tidak tersedia.");
  return res.json();
}

export async function requestOtp(token: string): Promise<{ sent: true }> {
  const res = await fetch(`${BASE}/api/claim/${token}/otp/request`, { method: "POST" });
  if (!res.ok) throw new Error("Kode OTP belum dapat dikirim.");
  return res.json();
}

export async function verifyOtp(token: string, code: string): Promise<{ ok: true; claimSession: string }> {
  const res = await fetch(`${BASE}/api/claim/${token}/otp/verify`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ code }),
  });
  if (!res.ok) throw new Error("Kode OTP tidak cocok.");
  return res.json();
}

export async function payout(token: string, method: PayoutMethod, details: Record<string, string> = {}): Promise<PayoutResponse> {
  const res = await fetch(`${BASE}/api/claim/${token}/payout`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ method, details }),
  });
  if (!res.ok) throw new Error("Pencairan belum dapat diproses.");
  return res.json();
}
