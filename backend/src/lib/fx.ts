// Kurs live REAL (foreign -> IDR). Lihat docs spec §14.7: kurs WAJIB real.
import type { Corridor } from "./types.js";

const CURRENCY: Record<Corridor, string> = { MY: "MYR", HK: "HKD" };
const FX_API = process.env.FX_API_URL ?? "https://open.er-api.com/v6/latest";

// contoh biaya kompetitor untuk fitur "transparansi biaya brutal"
const WU_FEE_RATE = 0.065; // ~6.5%

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
    feeIdr: "150", // fee kita (gasless disponsori) — angka demo
    comparison: {
      westernUnionFeeIdr: Math.round(amountIdr * WU_FEE_RATE).toString(),
    },
  };
}
