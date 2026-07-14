"use client";

import Image, { type StaticImageData } from "next/image";
import { useT } from "@/lib/i18n/locale-context";
import styles from "./landing.module.css";
import { Reveal } from "./reveal";
import kirimUangImg from "@/asset/fitur/kirim-uang.png";
import kunciImg from "@/asset/fitur/kunci.png";
import sanguBulananImg from "@/asset/fitur/sangu-bulanan.png";
import keluargaKlaimImg from "@/asset/fitur/keluarga-klaim2.png";

type Feature = { key: string; href: string; background: string; image: StaticImageData };

const FEATURES: Feature[] = [
  { key: "speed", href: "/app", background: "#ffe7d4", image: kirimUangImg },
  { key: "key", href: "#keamanan", background: "#dcf1ff", image: kunciImg },
  { key: "monthly", href: "/app", background: "#fff0c8", image: sanguBulananImg },
  { key: "claim", href: "/app", background: "#ffe8f9", image: keluargaKlaimImg },
];

export function Features() {
  const t = useT();
  return <section className={styles.section} aria-label={t("landing.features.ariaLabel")}>
    <div className={styles.container}>
      <Reveal className={styles.center}><h2 className={styles.sectionTitle}>{t("landing.features.sectionTitle")}</h2></Reveal>
      {FEATURES.map((feature, i) => <Reveal key={feature.key}>
        <div className={`${styles.feature} ${i % 2 === 1 ? styles.featureFlip : ""}`}>
          <div>
            <h3>{t(`landing.features.items.${feature.key}.title`)}</h3>
            <p>{t(`landing.features.items.${feature.key}.copy`)}</p>
            <a className={styles.pillDark} href={feature.href}>{t(`landing.features.items.${feature.key}.cta`)}</a>
          </div>
          <div className={styles.featureVisual} style={{ background: feature.background }}>
            <Image src={feature.image} alt={t(`landing.features.items.${feature.key}.alt`)} fill sizes="(max-width: 900px) 100vw, 50vw" className={styles.featurePhoto} />
          </div>
        </div>
      </Reveal>)}
    </div>
  </section>;
}
