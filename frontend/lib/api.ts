// Klien REST ke backend (spec §2.3). Bentuk tipe cermin backend/src/lib/types.ts.
const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export type Corridor = "MY" | "HK";
export type PayoutMethod = "dana" | "gopay" | "bank" | "cash";

export interface Quote {
  rate: string;
  amountIdr: string;
  feeIdr: string;
  comparison: { westernUnionFeeIdr: string };
}

export async function getQuote(corridor: Corridor, amountForeign: string): Promise<Quote> {
  const res = await fetch(`${BASE}/api/quote?corridor=${corridor}&amountForeign=${amountForeign}`);
  return res.json();
}

export async function send(body: {
  corridor: Corridor;
  amountForeign: string;
  recipientPhone: string;
}) {
  const res = await fetch(`${BASE}/api/send`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
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
  return res.json();
}
