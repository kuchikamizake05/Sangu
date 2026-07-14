// Klien REST ke backend (spec §2.3). Bentuk tipe cermin backend/src/lib/types.ts.
import type {
  AuthenticationResponseJSON,
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
  RegistrationResponseJSON,
} from "@simplewebauthn/browser";
import { getToken, onUnauthorized } from "./auth-session";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export class ApiError extends Error {
  code?: string;
  constructor(message: string, code?: string) {
    super(message);
    this.name = "ApiError";
    this.code = code;
  }
}

function withJsonBody(init?: RequestInit): RequestInit {
  const headers = new Headers(init?.headers);
  if (init?.body && !headers.has("content-type")) headers.set("content-type", "application/json");
  return { ...init, headers };
}

/** Fetch publik — dipakai claim/quote/auth (sebelum ada token). */
async function publicFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${BASE}${path}`, withJsonBody(init));
}

/** Fetch tersambung sesi — menyisipkan Bearer token; 401 di mana pun otomatis membersihkan sesi + redirect login. */
async function authFetch(path: string, init?: RequestInit): Promise<Response> {
  const prepared = withJsonBody(init);
  const headers = new Headers(prepared.headers);
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const res = await fetch(`${BASE}${path}`, { ...prepared, headers });
  if (res.status === 401) {
    onUnauthorized();
    throw new ApiError("Sesi berakhir, masuk kembali untuk melanjutkan.", "UNAUTHORIZED");
  }
  return res;
}

async function parseOrThrow<T>(res: Response, fallbackMessage: string): Promise<T> {
  if (!res.ok) {
    let code: string | undefined;
    let message = fallbackMessage;
    try {
      const body = await res.json();
      if (body?.error) {
        code = body.error.code;
        message = body.error.message || message;
      }
    } catch {
      // respons bukan JSON — pakai pesan fallback
    }
    throw new ApiError(message, code);
  }
  return res.json();
}

export type Corridor = "MY" | "HK";
export type PayoutMethod = "dana" | "gopay" | "bank" | "cash";

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
  /** Saat PAID_OUT: true bila pencairan sudah final (bukan lagi "diproses"). */
  payoutCompleted?: boolean;
}

export interface PayoutResponse {
  status: string;
  simulatedPayout?: boolean;
  cashCode?: string;
  instructions?: string;
}

export interface TransferSummary {
  transferId: string;
  status: "PENDING" | "CLAIMED" | "PAID_OUT" | "REFUNDED" | "EXPIRED";
  amount: string; // nominal mata uang asing (RM/HK$), bukan Rupiah
  corridor: Corridor;
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
  // §2.5 — selalu dikirim backend, opsional di sini agar mock/test lama (tanpa field ini) tetap kompatibel.
  recipientPhone?: string;
  dueNow?: boolean;
  lastTriggeredAt?: string | null;
}

export async function prepareSend(body: {
  corridor: Corridor;
  amountForeign: string;
  recipientPhone: string;
  methodHint?: PayoutMethod;
}): Promise<PrepareSendResponse> {
  const res = await authFetch("/api/send/prepare", { method: "POST", body: JSON.stringify(body) });
  return parseOrThrow(res, "Transfer belum dapat disiapkan.");
}

export async function submitSend(body: { transferId: string; signedXDR: string }): Promise<SubmitSendResponse> {
  const res = await authFetch("/api/send/submit", { method: "POST", body: JSON.stringify(body) });
  return parseOrThrow(res, "Transaksi belum dapat dikirim.");
}

export async function getTransfers(): Promise<TransferSummary[]> {
  const res = await authFetch("/api/transfers");
  return parseOrThrow(res, "Riwayat transfer belum dapat dimuat.");
}

export async function createRecurring(body: RecurringRequest): Promise<{ recurringId: string }> {
  const res = await authFetch("/api/recurring", { method: "POST", body: JSON.stringify(body) });
  return parseOrThrow(res, "Jadwal bulanan belum dapat disimpan.");
}

export async function getTransferDetail(transferId: string): Promise<TransferDetail> {
  const res = await authFetch(`/api/transfers/${transferId}`);
  return parseOrThrow(res, "Detail transfer belum dapat dimuat.");
}

async function recurringRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await authFetch(`/api/recurring${path}`, init);
  if (res.status === 204) return undefined as T;
  return parseOrThrow(res, "Jadwal bulanan belum dapat diperbarui.");
}

export function getRecurring(): Promise<RecurringSchedule[]> { return recurringRequest(""); }
export function updateRecurring(recurringId: string, body: Partial<RecurringRequest>): Promise<RecurringSchedule> { return recurringRequest(`/${recurringId}`, { method: "PATCH", body: JSON.stringify(body) }); }
export function setRecurringStatus(recurringId: string, action: "pause" | "resume"): Promise<{ recurringId: string; status: RecurringSchedule["status"] }> { return recurringRequest(`/${recurringId}/${action}`, { method: "POST" }); }
export function deleteRecurring(recurringId: string): Promise<void> { return recurringRequest(`/${recurringId}`, { method: "DELETE" }); }
export function markRecurringSent(recurringId: string): Promise<{ recurringId: string; dueNow: false }> { return recurringRequest(`/${recurringId}/sent`, { method: "POST" }); }

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

export async function payout(token: string, method: PayoutMethod, claimSession: string, details: Record<string, string> = {}): Promise<PayoutResponse> {
  const res = await fetch(`${BASE}/api/claim/${token}/payout`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ method, claimSession, details }),
  });
  if (!res.ok) throw new Error("Pencairan belum dapat diproses.");
  return res.json();
}

// ── Auth pengirim (§2) ──

export interface SenderProfile {
  senderId: string;
  name: string;
  phoneMasked: string;
  hasPasskey: boolean;
  walletAddress?: string | null;
}

export interface AuthSuccess {
  token: string;
  sender: SenderProfile;
}

export async function requestAuthOtp(phone: string): Promise<{ sent: true }> {
  const res = await publicFetch("/api/auth/otp/request", { method: "POST", body: JSON.stringify({ phone }) });
  return parseOrThrow(res, "Kode OTP belum dapat dikirim.");
}

export async function verifyAuthOtp(phone: string, code: string, name?: string): Promise<AuthSuccess> {
  const body: { phone: string; code: string; name?: string } = { phone, code };
  if (name) body.name = name;
  const res = await publicFetch("/api/auth/otp/verify", { method: "POST", body: JSON.stringify(body) });
  return parseOrThrow(res, "Kode OTP tidak dapat diverifikasi.");
}

export async function getPasskeyRegisterOptions(): Promise<PublicKeyCredentialCreationOptionsJSON> {
  const res = await authFetch("/api/auth/passkey/register/options", { method: "POST" });
  return parseOrThrow(res, "Pengaturan sidik jari belum dapat dimuat.");
}

export async function verifyPasskeyRegister(attestation: RegistrationResponseJSON, walletAddress: string): Promise<{ ok: true }> {
  const res = await authFetch("/api/auth/passkey/register/verify", {
    method: "POST",
    body: JSON.stringify({ attestation, walletAddress }),
  });
  return parseOrThrow(res, "Sidik jari belum dapat diaktifkan.");
}

export async function getPasskeyLoginOptions(phone: string): Promise<PublicKeyCredentialRequestOptionsJSON> {
  const res = await publicFetch("/api/auth/passkey/login/options", { method: "POST", body: JSON.stringify({ phone }) });
  return parseOrThrow(res, "Masuk dengan sidik jari belum dapat diproses.");
}

export async function verifyPasskeyLogin(phone: string, assertion: AuthenticationResponseJSON): Promise<AuthSuccess> {
  const res = await publicFetch("/api/auth/passkey/login/verify", { method: "POST", body: JSON.stringify({ phone, assertion }) });
  return parseOrThrow(res, "Masuk dengan sidik jari belum berhasil.");
}

export async function getMe(): Promise<SenderProfile & { walletAddress: string | null }> {
  const res = await authFetch("/api/auth/me");
  return parseOrThrow(res, "Profil belum dapat dimuat.");
}

// ── Saldo demo (wallet) ──

export interface WalletBalance {
  currency: "MYR" | "HKD";
  amount: string;
  idrEstimate: string;
  source: "onchain" | "demo";
}

export async function getWalletBalance(): Promise<WalletBalance> {
  const res = await authFetch("/api/wallet/balance");
  return parseOrThrow(res, "Saldo belum dapat dimuat.");
}

export async function topupWallet(amountForeign: string): Promise<WalletBalance> {
  const res = await authFetch("/api/wallet/topup", { method: "POST", body: JSON.stringify({ amountForeign }) });
  return parseOrThrow(res, "Top up belum dapat diproses.");
}

/** Submit tx deploy smart wallet (dari kit.createWallet) — backend fee-bump + kirim ke jaringan. */
export async function deployWallet(signedTx: string): Promise<{ submitted: boolean; txHash: string | null }> {
  const res = await authFetch("/api/wallet/deploy", { method: "POST", body: JSON.stringify({ signedTx }) });
  return parseOrThrow(res, "Aktivasi dompet belum berhasil.");
}
