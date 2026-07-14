"use client";

import { useEffect, useRef, useState } from "react";
import Image, { type StaticImageData } from "next/image";
import styles from "./landing.module.css";
import hero1Img from "@/asset/hero/hero1.png";
import hero2Img from "@/asset/hero/hero2.png";
import hero3Img from "@/asset/hero/hero3.png";
import hero4Img from "@/asset/hero/hero4.png";
import kirimUangImg from "@/asset/fitur/kirim-uang.png";
import kunciImg from "@/asset/fitur/kunci.png";
import sanguBulananImg from "@/asset/fitur/sangu-bulanan.png";
import keluargaKlaimImg from "@/asset/fitur/keluarga-klaim2.png";

type StripCard = { image: StaticImageData; alt: string };

const CARDS: StripCard[] = [
  { image: hero3Img, alt: "Perempuan mengirim uang dengan kurs asli dari rooftop kota." },
  { image: kunciImg, alt: "Layar pengaturan keamanan dan sidik jari di ponsel." },
  { image: hero1Img, alt: "Perempuan menerima pembayaran di ponselnya." },
  { image: sanguBulananImg, alt: "Mengirim nominal sangu secara terjadwal tiap bulan." },
  { image: keluargaKlaimImg, alt: "Ratna di Indonesia menerima transfer instan lewat link." },
  { image: kirimUangImg, alt: "Perantau mengirim uang lintas mata uang lewat aplikasi." },
  { image: hero4Img, alt: "Notifikasi transfer diterima di layar ponsel." },
  { image: hero2Img, alt: "Laki-laki membuka aplikasi transfer di pesawat." },
];

const REPEAT = 4;
const STEP_MS = 3400;

function StripCardView({ card, wide }: { card: StripCard; wide: boolean }) {
  return <div className={`${styles.stripCard} ${wide ? styles.stripCardWide : ""}`}>
    <Image src={card.image} alt={card.alt} fill sizes="600px" className={styles.stripPhoto} />
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
