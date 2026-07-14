import type { Corridor } from "./api";

// Metadata koridor asal kiriman (negara tempat pengirim mengirim uang).
// Satu sumber kebenaran untuk simbol, bendera, label negara, dan kode mata uang —
// dipakai di alur kirim, jadwal bulanan, dan riwayat.
export type CorridorMeta = {
  symbol: string; // simbol nominal, mis. "RM"
  flag: string; // emoji bendera
  country: string; // nama negara untuk pemilih koridor
  currency: string; // kode mata uang, mis. "MYR"
};

export const CORRIDORS: Record<Corridor, CorridorMeta> = {
  US: { symbol: "$", flag: "🇺🇸", country: "Amerika Serikat", currency: "USD" },
  MY: { symbol: "RM", flag: "🇲🇾", country: "Malaysia", currency: "MYR" },
  HK: { symbol: "HK$", flag: "🇭🇰", country: "Hong Kong", currency: "HKD" },
  JP: { symbol: "¥", flag: "🇯🇵", country: "Jepang", currency: "JPY" },
};

// Urutan tampil koridor di pemilih (konsisten dgn kalkulator landing).
export const CORRIDOR_ORDER: Corridor[] = ["US", "MY", "HK", "JP"];

export function isCorridor(value: unknown): value is Corridor {
  return typeof value === "string" && value in CORRIDORS;
}
