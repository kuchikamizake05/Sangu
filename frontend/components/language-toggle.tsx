"use client";

import { LOCALES, LOCALE_LABELS, LOCALE_SHORT } from "@/lib/i18n/config";
import { useLocale } from "@/lib/i18n/locale-context";
import styles from "./language-toggle.module.css";

type LanguageToggleProps = {
  /** "footer" uses short ID/EN pills; "settings" uses full language names. */
  variant?: "footer" | "settings";
  className?: string;
};

export function LanguageToggle({ variant = "footer", className }: LanguageToggleProps) {
  const { locale, setLocale, t } = useLocale();
  const labels = variant === "footer" ? LOCALE_SHORT : LOCALE_LABELS;

  return (
    <div
      className={`${styles.toggle} ${styles[variant]} ${className ?? ""}`}
      role="group"
      aria-label={t("settings.languageAria")}
    >
      {LOCALES.map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => setLocale(code)}
          aria-pressed={locale === code}
          className={styles.option}
          data-active={locale === code}
        >
          {labels[code]}
        </button>
      ))}
    </div>
  );
}
