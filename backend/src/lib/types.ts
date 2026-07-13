// Tipe bersama — cermin dari docs/spesifikasi-teknis-pembagian-kerja.md §2.3
// Frontend mengonsumsi bentuk yang sama.

export type Corridor = "MY" | "HK";
export type PayoutMethod = "dana" | "gopay" | "bank" | "cash";

export type TransferStatus =
  | "PENDING"
  | "CLAIMED"
  | "PAID_OUT"
  | "REFUNDED"
  | "EXPIRED";

// Quote = rate referensi + ESTIMASI biaya (review #6). Semua biaya dilabeli estimate + sumber + timestamp.
export interface Quote {
  rate: string; // rate referensi pasar (foreign -> IDR), BUKAN kurs remittance final
  amountIdr: string; // estimasi kotor
  usdcStroops: string; // nilai setara USDC (7 desimal) — internal, dipakai jumlah deposit escrow
  estimate: true;
  rateSource: string;
  rateAsOf: string; // ISO timestamp
  feeIdrEstimate: string;
  comparison: { westernUnionFeeIdrEstimate: string; note: string };
}

// ── NON-CUSTODIAL: kirim = 2 langkah (review #3). Backend TIDAK membelanjakan dana user. ──
export interface PrepareSendRequest {
  corridor: Corridor;
  amountForeign: string;
  recipientPhone: string; // E.164
  methodHint?: PayoutMethod;
  // Alamat smart wallet TIDAK dikirim dari frontend — diambil dari profil sender
  // hasil sesi login (docs/auth-pengirim-pembagian-kerja-fe-be.md §2.4).
}

export interface PrepareSendResponse {
  transferId: string;
  unsignedXDR: string; // di-authorize passkey smart wallet di frontend
  quote: Quote;
  expiry: number; // unix seconds
}

export interface SubmitSendRequest {
  transferId: string;
  signedXDR: string; // hasil sign passkey wallet
}

export interface SubmitSendResponse {
  transferId: string;
  escrowId: string;
  claimUrl: string; // hanya berisi token opaque — TIDAK ada secret (spec §2.2)
}

export interface ClaimInfo {
  senderName: string;
  amountIdr: string;
  corridor: Corridor;
  status: TransferStatus;
}

export interface PayoutRequest {
  method: PayoutMethod;
  details: Record<string, string>;
  claimSession: string; // sesi hasil verifikasi OTP — payout ditolak tanpa ini
}

// Payout: withdrawal SEP-24 nyata, tapi settlement IDR/tunai DISIMULASIKAN di layer anchor (review #5).
export interface PayoutResponse {
  status: TransferStatus;
  simulatedPayout: true; // jujur: leg fiat/tunai belum real
  cashCode?: string;
  instructions?: string;
  // SEP-24: anchor baru memberi memo tujuan SETELAH interactive flow diselesaikan.
  // Frontend menampilkan interactiveUrl ke penerima; backend memantau (scheduler) dan
  // membayar anchor otomatis begitu status pending_user_transfer_start.
  anchorTxId?: string;
  interactiveUrl?: string;
}
