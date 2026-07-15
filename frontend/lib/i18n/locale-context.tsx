"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { DEFAULT_LOCALE, INTL_LOCALES, LOCALE_STORAGE_KEY, type Locale, isLocale } from "./config";
import { translate } from "./index";

type LocaleContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  // Read persisted preference after mount so SSR and first client render match (both DEFAULT_LOCALE).
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY);
      if (isLocale(stored)) setLocaleState(stored);
    } catch {
      /* localStorage unavailable — keep default */
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    try {
      window.localStorage.setItem(LOCALE_STORAGE_KEY, next);
    } catch {
      /* ignore persistence failure */
    }
  }, []);

  const value = useMemo<LocaleContextValue>(
    () => ({ locale, setLocale, t: (key: string) => translate(locale, key) }),
    [locale, setLocale],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

/**
 * Locale used when a component renders without a LocaleProvider. In production
 * the whole app is wrapped by LocaleProvider (see app/layout.tsx), so this
 * branch only triggers in unit tests — which are written against Indonesian
 * copy. The user-facing default locale is DEFAULT_LOCALE (see config).
 */
const NO_PROVIDER_LOCALE: Locale = "id";

/**
 * Access the current locale and setter. Falls back to a fixed locale when used
 * outside a provider (e.g. in unit tests) so components render deterministically.
 */
export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (ctx) return ctx;
  return {
    locale: NO_PROVIDER_LOCALE,
    setLocale: () => {},
    t: (key: string) => translate(NO_PROVIDER_LOCALE, key),
  };
}

/** Convenience hook returning just the translate function. */
export function useT(): (key: string) => string {
  return useLocale().t;
}

/** BCP 47 tag untuk Intl.* (tanggal, angka, waktu relatif) sesuai locale aktif. */
export function useIntlLocale(): string {
  return INTL_LOCALES[useLocale().locale];
}
