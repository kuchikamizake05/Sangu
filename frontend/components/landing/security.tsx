"use client";

import { useState, type ComponentType, type SVGProps } from "react";
import Image, { type StaticImageData } from "next/image";
import { useT } from "@/lib/i18n/locale-context";
import styles from "./landing.module.css";
import { BellIcon, EyeIcon, KeyIcon, ShieldIcon } from "./icons";
import kunciImg from "@/asset/security-section/kunci.png";
import notifImg from "@/asset/security-section/notif.png";
import protectedImg from "@/asset/security-section/protected.png";
import walletImg from "@/asset/security-section/security-wallet2.png";

type Row = {
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
  key: string;
  gradient: string;
  image: StaticImageData;
  scale?: number;
  fit?: "cover" | "contain";
};

const ROWS: Row[] = [
  {
    Icon: KeyIcon, key: "key",
    gradient: "linear-gradient(160deg,#8a5a44,#3b2317 70%)",
    image: kunciImg, scale: 1.12,
  },
  {
    Icon: BellIcon, key: "bell",
    gradient: "linear-gradient(160deg,#44708a,#17293b 70%)",
    image: notifImg,
  },
  {
    Icon: EyeIcon, key: "eye",
    gradient: "linear-gradient(160deg,#5a8a4a,#1e3b17 70%)",
    image: protectedImg,
  },
  {
    Icon: ShieldIcon, key: "shield",
    gradient: "linear-gradient(160deg,#7a5a8a,#2d173b 70%)",
    image: walletImg,
  },
];

export function Security() {
  const t = useT();
  const [active, setActive] = useState(0);
  const row = ROWS[active];

  return <section id="keamanan" className={styles.securityBand}>
    <div className={`${styles.container} ${styles.securityGrid}`}>
      <div className={styles.securityLeft}>
        <h2 className={`${styles.sectionTitle} ${styles.securityTitle}`}>{t("landing.security.title")}</h2>
        <div className={styles.secRows}>
          {ROWS.map((r, i) => <button key={r.key} type="button" className={`${styles.secRow} ${i === active ? styles.secRowLight : ""}`} aria-pressed={i === active} onClick={() => setActive(i)}>
            <span className={styles.secIcon}><r.Icon /></span>
            <span><h3>{t(`landing.security.rows.${r.key}.title`)}</h3><p>{t(`landing.security.rows.${r.key}.copy`)}</p></span>
          </button>)}
        </div>
        <p className={styles.secLegal}>{t("landing.security.legal")}</p>
      </div>
      <div key={active} className={styles.secVisual} style={{ background: row.gradient }}>
        <Image src={row.image} alt={t(`landing.security.rows.${row.key}.alt`)} fill priority={active === 0} sizes="(max-width: 900px) 100vw, 50vw" className={styles.secPhoto} style={{ scale: row.scale ?? 1, objectFit: row.fit ?? "cover" }} />
      </div>
    </div>
  </section>;
}
