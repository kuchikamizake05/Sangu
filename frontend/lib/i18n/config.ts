export const LOCALES = ["id", "en"] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

export const LOCALE_STORAGE_KEY = "sangu.locale";

export const LOCALE_LABELS: Record<Locale, string> = {
  id: "Indonesia",
  en: "English",
};

/** Short labels for compact toggles. */
export const LOCALE_SHORT: Record<Locale, string> = {
  id: "ID",
  en: "EN",
};

/** BCP 47 tag per locale untuk Intl.* (format tanggal, angka, waktu relatif). */
export const INTL_LOCALES: Record<Locale, string> = {
  id: "id-ID",
  en: "en-US",
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}
