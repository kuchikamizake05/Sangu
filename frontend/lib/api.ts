// Klien REST ke backend (spec §2.3). Bentuk tipe cermin backend/src/lib/types.ts.
const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export type Corridor = "MY" | "HK";
export type PayoutMethod = "dana" | "gopay" | "bank" | "cash";

// Quote = rate referensi + ESTIMASI biaya (bukan kurs remittance final).
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

// Kirim = 2 langkah (non-custodial): prepare -> sign (passkey) -> submit.
export async function prepareSend(body: {
  corridor: Corridor;
  amountForeign: string;
  recipientPhone: string;
}) {
  const res = await fetch(`${BASE}/api/send/prepare`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json() as Promise<{ transferId: string; unsignedXDR: string; quote: Quote; expiry: number }>;
}

export async function submitSend(body: { transferId: string; signedXDR: string }) {
  const res = await fetch(`${BASE}/api/send/submit`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json() as Promise<{ transferId: string; escrowId: string; claimUrl: string }>;
}

// TODO(Spike 1): passkey smart wallet meng-authorize/sign unsignedXDR → signedXDR.
export async function signWithPasskey(_unsignedXDR: string): Promise<string> {
  throw new Error("TODO: passkey-kit sign (Spike 1)");
}

export async function getClaim(token: string) {
  const res = await fetch(`${BASE}/api/claim/${token}`);
  return res.json();
}

export async function payout(token: string, method: PayoutMethod, details: Record<string, string> = {}) {
  const res = await fetch(`${BASE}/api/claim/${token}/payout`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ method, details }),
  });
  return res.json() as Promise<{ status: string; simulatedPayout: boolean; cashCode?: string; instructions?: string }>;
}
