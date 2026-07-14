// Kurs FX referensi (foreign -> IDR). Lihat docs spec §14.7 & review #6:
// - Rate ini REAL dari FX API, TAPI = rate REFERENSI pasar, BUKAN kurs remittance final.
// - feeIdr & perbandingan Western Union = ESTIMASI/DEMO, wajib dilabeli + sumber + timestamp.
import type { Corridor } from "./types.js";

const CURRENCY: Record<Corridor, string> = { MY: "MYR", HK: "HKD" };
const FX_API = process.env.FX_API_URL ?? "https://open.er-api.com/v6/latest";

// Estimasi biaya kompetitor untuk fitur transparansi — ANGKA DEMO, bukan kutipan resmi.
const WU_FEE_RATE_ESTIMATE = 0.065; // ~6.5% (rata-rata global, ilustratif)

/** Kurs 1 unit mata uang koridor dalam USD (mis. MYR→USD ~0.21). Untuk konversi saldo USDC on-chain → tampilan foreign. */
export async function foreignToUsdRate(corridor: Corridor): Promise<number> {
  const cur = CURRENCY[corridor];
  const res = await fetch(`${FX_API}/${cur}`);
  const data = (await res.json()) as { rates?: Record<string, number> };
  const usdRate = data.rates?.USD;
  if (!usdRate) throw new Error(`FX rate ${cur}->USD tidak tersedia`);
  return usdRate;
}

/** Kurs USD → mata uang tampilan saldo + IDR (sekali fetch). */
export async function ratesFromUsd(): Promise<{ MYR: number; HKD: number; IDR: number }> {
  const res = await fetch(`${FX_API}/USD`);
  const data = (await res.json()) as { rates?: Record<string, number> };
  const { MYR, HKD, IDR } = data.rates ?? {};
  if (!MYR || !HKD || !IDR) throw new Error("FX rate USD tidak tersedia");
  return { MYR, HKD, IDR };
}

/** Konversi stroops USDC (7 desimal) → nominal mata uang koridor (string 2 desimal). */
export async function usdcStroopsToForeign(corridor: Corridor, stroops: bigint): Promise<string> {
  const usd = Number(stroops) / 1e7;
  const rate = await foreignToUsdRate(corridor); // 1 foreign = rate USD
  return (usd / rate).toFixed(2);
}

export async function getQuote(corridor: Corridor, amountForeign: number) {
  const cur = CURRENCY[corridor];
  const res = await fetch(`${FX_API}/${cur}`);
  const data = (await res.json()) as { rates?: Record<string, number> };
  const rate = data.rates?.IDR;
  const usdRate = data.rates?.USD;
  if (!rate || !usdRate) throw new Error(`FX rate ${cur}->IDR/USD tidak tersedia`);

  const amountIdr = amountForeign * rate;
  // Nilai setara USDC (7 desimal, stroops) — dipakai internal untuk jumlah deposit escrow.
  const usdcStroops = BigInt(Math.round(amountForeign * usdRate * 1e7)).toString();
  return {
    rate: rate.toFixed(2),
    amountIdr: Math.round(amountIdr).toString(),
    usdcStroops, // internal (frontend boleh abaikan)
    // semua di bawah = estimasi/demo, wajib ditandai di UI
    estimate: true as const,
    rateSource: FX_API,
    rateAsOf: new Date().toISOString(),
    feeIdrEstimate: "150", // fee kita (ilustratif; gasless disponsori)
    comparison: {
      westernUnionFeeIdrEstimate: Math.round(amountIdr * WU_FEE_RATE_ESTIMATE).toString(),
      note: "Estimasi ilustratif — bukan kutipan resmi WU.",
    },
  };
}
