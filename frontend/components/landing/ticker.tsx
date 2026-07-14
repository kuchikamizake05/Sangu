"use client";

import { useT } from "@/lib/i18n/locale-context";
import styles from "./landing.module.css";

const PARTNER_KEYS = ["stellar", "usdc", "passkey", "noncustodial"];
// Ulang tiap paruh agar baris selalu penuh melintang (tak numpuk di kiri).
const GROUP = [...PARTNER_KEYS, ...PARTNER_KEYS, ...PARTNER_KEYS];

export function Ticker() {
  const t = useT();
  return <section className={styles.tickerSection}>
    <h2 className={styles.tickerLabel}>{t("landing.ticker.title")}</h2>
    <div className={styles.ticker}>
      <div className={styles.tickerTrack}>
        {[0, 1].map((copy) => GROUP.map((key, i) => <span key={`${copy}-${i}`} className={styles.tickerItem} aria-hidden={copy === 1 || i >= PARTNER_KEYS.length || undefined}>{t(`landing.ticker.partners.${key}`)}</span>))}
      </div>
    </div>
  </section>;
}
