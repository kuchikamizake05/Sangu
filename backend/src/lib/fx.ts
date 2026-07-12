// Kurs FX referensi (foreign -> IDR). Lihat docs spec §14.7 & review #6:
// - Rate ini REAL dari FX API, TAPI = rate REFERENSI pasar, BUKAN kurs remittance final.
// - feeIdr & perbandingan Western Union = ESTIMASI/DEMO, wajib dilabeli + sumber + timestamp.
import type { Corridor } from "./types.js";

const CURRENCY: Record<Corridor, string> = { MY: "MYR", HK: "HKD" };
const FX_API = process.env.FX_API_URL ?? "https://open.er-api.com/v6/latest";

// Estimasi biaya kompetitor untuk fitur transparansi — ANGKA DEMO, bukan kutipan resmi.
const WU_FEE_RATE_ESTIMATE = 0.065; // ~6.5% (rata-rata global, ilustratif)

export async function getQuote(corridor: Corridor, amountForeign: number) {
  const cur = CURRENCY[corridor];
  const res = await fetch(`${FX_API}/${cur}`);
  const data = (await res.json()) as { rates?: Record<string, number> };
  const rate = data.rates?.IDR;
  if (!rate) throw new Error(`FX rate ${cur}->IDR tidak tersedia`);

  const amountIdr = amountForeign * rate;
  return {
    rate: rate.toFixed(2),
    amountIdr: Math.round(amountIdr).toString(),
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
