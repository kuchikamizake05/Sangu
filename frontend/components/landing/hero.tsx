"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./landing.module.css";

type StripCard =
  | { kind: "photo"; name: string; flag: string; gradient: string }
  | { kind: "phone"; balance: string; row: string; rowDetail: string; dot: string; button: string; gradient: string };

const CARDS: StripCard[] = [
  { kind: "photo", name: "Sari", flag: "🇲🇾", gradient: "linear-gradient(160deg,#ffb37c,#ff5113 80%)" },
  { kind: "phone", balance: "RM 1,840.00", row: "Ke Ibu · Wonosobo", rowDetail: "Rp 1.842.500", dot: "#ff5113", button: "Kirim sekarang", gradient: "linear-gradient(160deg,#ffe7d4,#ffd1a6)" },
  { kind: "photo", name: "Yanti", flag: "🇭🇰", gradient: "linear-gradient(160deg,#7cc3ff,#1b6fae 80%)" },
  { kind: "photo", name: "Budi", flag: "🇲🇾", gradient: "linear-gradient(160deg,#ffd88a,#c98a1b 80%)" },
  { kind: "phone", balance: "Tiap tanggal 25", row: "Sangu rutin · aktif", rowDetail: "RM 500/bln", dot: "#278f35", button: "Kelola jadwal", gradient: "linear-gradient(160deg,#e2f6de,#b9e4b1)" },
  { kind: "photo", name: "Rina", flag: "🇹🇼", gradient: "linear-gradient(160deg,#f2a9d6,#a2427e 80%)" },
  { kind: "photo", name: "Dewi", flag: "🇸🇦", gradient: "linear-gradient(160deg,#c9b8ff,#5c3fae 80%)" },
  { kind: "phone", balance: "Link klaim siap", row: "Menunggu diklaim", rowDetail: "24 jam", dot: "#9e1d0e", button: "Bagikan link", gradient: "linear-gradient(160deg,#ffe0f4,#ffb3e2)" },
];

const REPEAT = 4;
const STEP_MS = 3400;

function StripCardView({ card, wide }: { card: StripCard; wide: boolean }) {
  return <div className={`${styles.stripCard} ${wide ? styles.stripCardWide : ""}`} style={{ background: card.gradient }}>
    {card.kind === "phone" && <div className={styles.phone} aria-hidden="true">
      <span className={styles.phoneNotch} />
      <div className={styles.phoneCard}><small>Saldo Sangu</small><strong>{card.balance}</strong></div>
      <div className={styles.phoneRow}><span className={styles.phoneDot} style={{ background: card.dot }} /><span>{card.row}<small>{card.rowDetail}</small></span></div>
      <div className={styles.phoneBtn}>{card.button}</div>
    </div>}
    {card.kind === "photo" && <span className={styles.stripBadge}>{card.name} <span aria-hidden="true">{card.flag}</span></span>}
  </div>;
}

function HeroStrip() {
  const [index, setIndex] = useState(CARDS.length);
  const [animate, setAnimate] = useState(true);
  const reducedMotion = useRef(false);

  useEffect(() => {
    if (typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) { reducedMotion.current = true; return; }
    const id = setInterval(() => setIndex((i) => i + 1), STEP_MS);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (index < CARDS.length * (REPEAT - 1)) return;
    const id = setTimeout(() => {
      setAnimate(false);
      setIndex((i) => i - CARDS.length);
      requestAnimationFrame(() => requestAnimationFrame(() => setAnimate(true)));
    }, 750);
    return () => clearTimeout(id);
  }, [index]);

  return <div className={styles.strip} aria-hidden="true">
    <div
      className={`${styles.stripTrack} ${animate ? "" : styles.stripTrackNoAnim}`}
      style={{ transform: `translateX(calc(50vw - (var(--strip-wide) / 2) - (${index} * var(--strip-step))))` }}
    >
      {Array.from({ length: REPEAT }, (_, copy) => CARDS.map((card, i) => <StripCardView key={`${copy}-${i}`} card={card} wide={copy * CARDS.length + i === index} />))}
    </div>
  </div>;
}

export function Hero() {
  return <>
    <section className={styles.hero}>
      <div className={styles.container}>
        <h1 className={styles.heroTitle}>Sangu pulang untuk <span className={styles.flipSlot}>keluarga</span>.</h1>
        <p className={styles.heroSub}>Kirim uang dari rantau ke rumah dalam hitungan detik, dengan kurs asli dan kunci yang tetap milikmu.</p>
        <div className={styles.heroCtas}>
          <a className={`${styles.pill} ${styles.pillLarge}`} href="/app">Buka akun gratis</a>
          <a className={`${styles.pillGhost} ${styles.pillLarge}`} href="#kurs">Lihat kursnya</a>
        </div>
      </div>
    </section>
    <HeroStrip />
  </>;
}
