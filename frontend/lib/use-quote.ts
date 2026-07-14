"use client";

import { useEffect, useState } from "react";
import { getQuote, type Corridor, type Quote } from "./api";

const DEBOUNCE_MS = 400;

function isFetchableAmount(amountForeign: string): boolean {
  if (amountForeign.trim() === "") return false;
  const value = Number(amountForeign);
  return Number.isFinite(value) && value > 0;
}

/**
 * Kurs live untuk layar jumlah (state B) — debounce ~400ms, tidak fetch bila nominal
 * kosong/0/invalid, dan mengabaikan respons kurs yang sudah basi (amount berubah lagi
 * sebelum request lama selesai) lewat AbortController.
 */
export function useQuote(corridor: Corridor, amountForeign: string): { quote: Quote | null; loading: boolean; error: string | null } {
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isFetchableAmount(amountForeign)) {
      setQuote(null);
      setLoading(false);
      setError(null);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setError(null);

    const timer = setTimeout(() => {
      getQuote(corridor, amountForeign)
        .then((result) => {
          if (controller.signal.aborted) return;
          setQuote(result);
          setLoading(false);
        })
        .catch(() => {
          if (controller.signal.aborted) return;
          setQuote(null);
          setError("Kurs belum dapat dimuat. Coba lagi.");
          setLoading(false);
        });
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [corridor, amountForeign]);

  return { quote, loading, error };
}
