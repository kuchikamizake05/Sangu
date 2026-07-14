"use client";

import { useT } from "@/lib/i18n/locale-context";
import styles from "./landing.module.css";
import { Reveal } from "./reveal";

type Card = { key: string; by: string; flag: string };

const CARDS: Card[] = [
  { key: "sari", by: "Sari", flag: "🇲🇾 MY" },
  { key: "fitri", by: "Fitri", flag: "🇸🇬 SG" },
  { key: "yanti", by: "Yanti", flag: "🇭🇰 HK" },
  { key: "budi", by: "Budi", flag: "🇲🇾 MY" },
  { key: "hendra", by: "Hendra", flag: "🇦🇪 AE" },
  { key: "rina", by: "Rina", flag: "🇹🇼 TW" },
  { key: "dewi", by: "Dewi", flag: "🇸🇦 SA" },
];

function CardView({ card }: { card: Card }) {
  const t = useT();
  return <figure className={styles.commCard}>
    <blockquote>{t(`landing.testimonials.cards.${card.key}`)}</blockquote>
    <figcaption className={styles.commFoot}><span>{card.by}</span><span className={styles.commFlag}>{card.flag}</span></figcaption>
  </figure>;
}

export function Testimonials() {
  const t = useT();
  return <section className={styles.community} aria-label={t("landing.testimonials.ariaLabel")}>
    <div className={styles.container}>
      <Reveal className={styles.center}>
        <h2 className={styles.sectionTitle}>{t("landing.testimonials.title")}</h2>
        <p className={styles.sectionSub}>{t("landing.testimonials.sub")}</p>
      </Reveal>
    </div>
    <div className={styles.commMarquee}>
      <div className={styles.commTrack}>
        {[0, 1].map((copy) => CARDS.map((card, i) => <div key={`${copy}-${i}`} aria-hidden={copy === 1 || undefined} className={styles.contents}><CardView card={card} /></div>))}
      </div>
    </div>
  </section>;
}
