"use client";

import { useT } from "@/lib/i18n/locale-context";
import styles from "./landing.module.css";

export function LandingNav() {
  const t = useT();
  return <header className={styles.nav}>
    <a className={styles.brand} href="/" aria-label={t("landing.nav.brandAria")}>sangu<span>·</span></a>
    <a className={styles.pill} href="/app">{t("landing.nav.cta")}</a>
  </header>;
}
