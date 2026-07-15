"use client";

import { useEffect, useRef, useState } from "react";
import Image, { type StaticImageData } from "next/image";
import { useT } from "@/lib/i18n/locale-context";
import styles from "./landing.module.css";
import hero1Img from "@/asset/hero/hero1.png";
import hero2Img from "@/asset/hero/hero2.png";
import hero3Img from "@/asset/hero/hero3.png";
import hero4Img from "@/asset/hero/hero4.png";
import kirimUangImg from "@/asset/fitur/kirim-uang.png";
import kunciImg from "@/asset/fitur/kunci.png";
import sanguBulananImg from "@/asset/fitur/sangu-bulanan.png";
import keluargaKlaimImg from "@/asset/fitur/keluarga-klaim2.png";

type StripCard = { image: StaticImageData; altKey: string };

const CARDS: StripCard[] = [
  { image: hero3Img, altKey: "landing.hero.strip.alt1" },
  { image: kunciImg, altKey: "landing.hero.strip.alt2" },
  { image: hero1Img, altKey: "landing.hero.strip.alt3" },
  { image: sanguBulananImg, altKey: "landing.hero.strip.alt4" },
  { image: keluargaKlaimImg, altKey: "landing.hero.strip.alt5" },
  { image: kirimUangImg, altKey: "landing.hero.strip.alt6" },
  { image: hero4Img, altKey: "landing.hero.strip.alt7" },
  { image: hero2Img, altKey: "landing.hero.strip.alt8" },
];

const REPEAT = 4;
const STEP_MS = 3400;
// Harus >= durasi transition .stripTrack/.stripCard di landing.module.css: lompat balik
// hanya aman setelah transisi selesai, supaya posisi track & lebar kartu sudah settle dan
// snap ke copy sebelumnya jadi pixel-identical (tak terlihat).
const TRANSITION_MS = 1200;

function StripCardView({ card, wide }: { card: StripCard; wide: boolean }) {
  const t = useT();
  return <div className={`${styles.stripCard} ${wide ? styles.stripCardWide : ""}`}>
    <Image src={card.image} alt={t(card.altKey)} fill sizes="600px" className={styles.stripPhoto} />
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
    }, TRANSITION_MS + 50);
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
  const t = useT();
  return <>
    <section className={styles.hero}>
      <div className={styles.container}>
        <h1 className={styles.heroTitle}>{t("landing.hero.title")} <span className={styles.flipSlot}>{t("landing.hero.titleHighlight")}</span>.</h1>
        <p className={styles.heroSub}>{t("landing.hero.sub")}</p>
        <div className={styles.heroCtas}>
          <a className={`${styles.pill} ${styles.pillLarge}`} href="/app">{t("landing.hero.ctaPrimary")}</a>
          <a className={`${styles.pillGhost} ${styles.pillLarge}`} href="#kurs">{t("landing.hero.ctaSecondary")}</a>
        </div>
      </div>
    </section>
    <HeroStrip />
  </>;
}
