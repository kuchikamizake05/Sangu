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

// Saldo dompet pengirim (spec fitur saldo). Mode demo (default): saldo tersimpan di DB,
// dikredit via /api/wallet/topup (mock on-ramp). Mode on-chain: TODO baca saldo USDC nyata
// dari smart wallet via helper baca-saldo di stellar/ bila sudah tersedia.
export interface WalletBalanceResponse {
  currency: "MYR" | "HKD";
  amount: string; // saldo dalam `currency`, string desimal (mis. "1840.00")
  idrEstimate: string; // estimasi rupiah, string bulat
  source: "onchain" | "demo";
}

export interface ClaimInfo {
  senderName: string;
  amountIdr: string;
  corridor: Corridor;
  status: TransferStatus;
  /**
   * Hanya bermakna saat status PAID_OUT: true bila pencairan sudah final dari sudut
   * pandang penerima (anchor terbayar / jalur simulasi), false bila masih diproses
   * (withdrawal anchor in-flight). Frontend memakai ini untuk transisi
   * "Pencairan diproses" → "Dana sudah masuk".
   */
  payoutCompleted?: boolean;
}

export interface PayoutRequest {
  method: PayoutMethod;
  details: Record<string, string>;
  claimSession: string; // sesi hasil verifikasi OTP — payout ditolak tanpa ini
}

// Payout: withdrawal SEP-24 nyata, tapi settlement IDR/tunai DISIMULASIKAN di layer anchor (review #5).
// Anchor (SEP-24) TIDAK pernah tampil ke penerima — interactive flow adalah tugas operator;
// referensinya tersimpan di transfer (anchorTxId dkk.) untuk poller & detail pengirim.
export interface PayoutResponse {
  status: TransferStatus;
  simulatedPayout: true; // jujur: leg fiat/tunai belum real
  cashCode?: string;
  instructions?: string;
}
