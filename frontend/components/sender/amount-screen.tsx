"use client";

import { Button } from "@/components/ui/button";
import type { Corridor, Quote } from "@/lib/api";
import { CORRIDORS } from "@/lib/corridors";
import { Numpad, type NumpadKey } from "./numpad";

function amountFontSize(displayValue: string): string {
  const digitCount = displayValue.replace(".", "").length;
  if (digitCount > 7) return "text-4xl";
  if (digitCount > 5) return "text-5xl";
  return "text-6xl";
}

export function AmountScreen({
  corridor,
  amount,
  quote,
  loading,
  error,
  onKey,
  onContinue,
  canContinue,
}: {
  corridor: Corridor;
  amount: string;
  quote: Quote | null;
  loading: boolean;
  error: string | null;
  onKey: (key: NumpadKey) => void;
  onContinue: () => void;
  canContinue: boolean;
}) {
  const symbol = CORRIDORS[corridor].symbol;
  const hasAmount = amount.length > 0;
  const displayValue = hasAmount ? amount : "0";

  return (
    <div className="flex min-h-[70dvh] flex-col">
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 text-center">
        <p className="text-xs font-extrabold tracking-[.15em] text-brand-deep">JUMLAH KIRIM</p>
        <p className={`font-extrabold tabular-nums tracking-[-.04em] ${amountFontSize(displayValue)} ${hasAmount ? "text-ink" : "text-muted"}`}>
          {symbol} {displayValue}
        </p>
        <div className="min-h-[20px] text-sm" aria-live="polite">
          {loading && <span className="text-muted">Menghitung…</span>}
          {!loading && error && <span className="font-semibold text-danger">{error}</span>}
          {!loading && !error && quote && (
            <span className="text-muted">
              ≈ Rp {Number(quote.amountIdr).toLocaleString("id-ID")} untuk penerima · biaya Rp {Number(quote.feeIdrEstimate).toLocaleString("id-ID")}
            </span>
          )}
        </div>
      </div>

      <div className="px-1 pb-3">
        <Numpad onKey={onKey} />
      </div>
      <Button fullWidth onClick={onContinue} disabled={!canContinue}>Lanjutkan</Button>
    </div>
  );
}
