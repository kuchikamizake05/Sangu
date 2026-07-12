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

export interface Quote {
  rate: string; // kurs live (foreign -> IDR)
  amountIdr: string;
  feeIdr: string;
  comparison: { westernUnionFeeIdr: string };
}

export interface SendRequest {
  corridor: Corridor;
  amountForeign: string;
  recipientPhone: string; // E.164
  methodHint?: PayoutMethod;
}

export interface SendResponse {
  transferId: string;
  escrowId: string;
  claimUrl: string;
  quote: Quote;
  expiry: number; // unix seconds
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
}

export interface PayoutResponse {
  status: TransferStatus;
  cashCode?: string;
  instructions?: string;
}
