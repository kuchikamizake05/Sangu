"use client";

import { useState, type ComponentType, type SVGProps } from "react";
import Image, { type StaticImageData } from "next/image";
import styles from "./landing.module.css";
import { BellIcon, EyeIcon, KeyIcon, ShieldIcon } from "./icons";
import kunciImg from "@/asset/security-section/kunci.png";
import notifImg from "@/asset/security-section/notif.png";
import protectedImg from "@/asset/security-section/protected.png";
import walletImg from "@/asset/security-section/security-wallet2.png";

type Row = {
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
  title: string;
  copy: string;
  gradient: string;
  image: StaticImageData;
  alt: string;
  scale?: number;
  fit?: "cover" | "contain";
};

const ROWS: Row[] = [
  {
    Icon: KeyIcon, title: "Kunci transfer sekali sentuh", copy: "Konfirmasi tiap kiriman dengan sidik jari atau wajah.",
    gradient: "linear-gradient(160deg,#8a5a44,#3b2317 70%)",
    image: kunciImg, alt: "Kartu Sangu terkunci di aplikasi, dibuka dengan sidik jari.", scale: 1.12,
  },
  {
    Icon: BellIcon, title: "Notifikasi instan", copy: "Tahu persis saat uangmu bergerak, dari berangkat sampai diklaim.",
    gradient: "linear-gradient(160deg,#44708a,#17293b 70%)",
    image: notifImg, alt: "Notifikasi transfer masuk dan keluar di layar ponsel.",
  },
  {
    Icon: EyeIcon, title: "Terlindungi 24/7", copy: "Setiap transaksi tercatat permanen dan bisa diperiksa kapan pun.",
    gradient: "linear-gradient(160deg,#5a8a4a,#1e3b17 70%)",
    image: protectedImg, alt: "Peringatan verifikasi login aktivitas baru di akun.",
  },
  {
    Icon: ShieldIcon, title: "Kendali penuh di tanganmu", copy: "Tidak ada yang bisa menyentuh uangmu, bahkan Sangu.",
    gradient: "linear-gradient(160deg,#7a5a8a,#2d173b 70%)",
    image: walletImg, alt: "Keluarga tersenyum dengan lapisan keamanan sidik jari.",
  },
];

export function Security() {
  const [active, setActive] = useState(0);
  const row = ROWS[active];

  return <section id="keamanan" className={styles.securityBand}>
    <div className={`${styles.container} ${styles.securityGrid}`}>
      <div className={styles.securityLeft}>
        <h2 className={`${styles.sectionTitle} ${styles.securityTitle}`}>Aman sejak dirancang.</h2>
        <div className={styles.secRows}>
          {ROWS.map((r, i) => <button key={r.title} type="button" className={`${styles.secRow} ${i === active ? styles.secRowLight : ""}`} aria-pressed={i === active} onClick={() => setActive(i)}>
            <span className={styles.secIcon}><r.Icon /></span>
            <span><h3>{r.title}</h3><p>{r.copy}</p></span>
          </button>)}
        </div>
        <p className={styles.secLegal}>Kunci keamanan uangmu tersimpan di perangkatmu dan tidak pernah menyentuh server kami — hanya kamu yang bisa menggerakkan uangmu. Versi demo — bukan layanan keuangan berizin.</p>
      </div>
      <div key={active} className={styles.secVisual} style={{ background: row.gradient }}>
        <Image src={row.image} alt={row.alt} fill priority={active === 0} sizes="(max-width: 900px) 100vw, 50vw" className={styles.secPhoto} style={{ scale: row.scale ?? 1, objectFit: row.fit ?? "cover" }} />
      </div>
    </div>
  </section>;
}
