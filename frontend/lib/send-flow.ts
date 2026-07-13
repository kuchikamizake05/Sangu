import type { Corridor } from "./api";

export type SenderStep = 1 | 2 | 3 | 4;

export function isE164Phone(value: string) {
  return /^\+[1-9]\d{7,14}$/.test(value.replaceAll(" ", ""));
}

export function canAdvance({ step, amount, phone, hasQuote }: { step: SenderStep; amount: string; phone: string; hasQuote: boolean }) {
  if (step === 1) return isE164Phone(phone);
  if (step === 2) return Number(amount) > 0 && hasQuote;
  return true;
}

export function formatForeignAmount(value: string, corridor: Corridor) {
  const amount = Number(value) || 0;
  const number = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
  return corridor === "MY" ? `RM\u00a0${number}` : `HK$${number}`;
}
