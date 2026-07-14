import type { Corridor } from "./api";

export function isE164Phone(value: string) {
  return /^\+[1-9]\d{7,14}$/.test(value.replaceAll(" ", ""));
}

export function formatForeignAmount(value: string, corridor: Corridor) {
  const amount = Number(value) || 0;
  const number = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
  return corridor === "MY" ? `RM ${number}` : `HK$${number}`;
}

const MAX_INTEGER_DIGITS = 6;
const MAX_DECIMAL_DIGITS = 2;

/** Menghapus karakter terakhir dari input nominal numpad (string kosong bila sudah habis). */
export function deleteDigit(current: string): string {
  return current.slice(0, -1);
}

/**
 * Menambahkan digit atau titik desimal ke input nominal numpad, sambil menjaga format tetap valid:
 * maksimum dua angka desimal, tidak ada leading zero ganda ("00", "01"…), dan maksimum enam digit bulat.
 */
export function appendDigit(current: string, key: string): string {
  if (key === "del") return deleteDigit(current);

  if (key === ".") {
    if (current === "") return "0.";
    if (current.includes(".")) return current;
    return `${current}.`;
  }

  if (!/^[0-9]$/.test(key)) return current;

  const hasDecimalPoint = current.includes(".");
  const [integerPart = "", decimalPart] = current.split(".");

  if (hasDecimalPoint) {
    if ((decimalPart ?? "").length >= MAX_DECIMAL_DIGITS) return current;
    return `${current}${key}`;
  }

  if (integerPart === "0") return key === "0" ? current : key;
  if (integerPart.length >= MAX_INTEGER_DIGITS) return current;
  return `${current}${key}`;
}
