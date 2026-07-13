"use client";

import { useState, type ComponentType, type SVGProps } from "react";
import styles from "./landing.module.css";
import { BellIcon, EyeIcon, KeyIcon, ShieldIcon } from "./icons";

type Row = {
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
  title: string;
  copy: string;
  gradient: string;
  panel: { cardLabel: string; cardValue: string; buttons: string[]; rows: { label: string; value: string }[] };
};

const ROWS: Row[] = [
  {
    Icon: KeyIcon, title: "Kunci transfer sekali sentuh", copy: "Konfirmasi tiap kiriman dengan sidik jari atau wajah lewat passkey.",
    gradient: "linear-gradient(160deg,#8a5a44,#3b2317 70%)",
    panel: { cardLabel: "Saldo Sangu", cardValue: "RM 1,840.00", buttons: ["Tampilkan detail", "Terkunci"], rows: [{ label: "Pemilik akun", value: "Sari Rahayu" }, { label: "Passkey", value: "Perangkat ini · aktif" }] },
  },
  {
    Icon: BellIcon, title: "Notifikasi instan", copy: "Tahu persis saat uangmu bergerak, dari berangkat sampai diklaim.",
    gradient: "linear-gradient(160deg,#44708a,#17293b 70%)",
    panel: { cardLabel: "Baru saja", cardValue: "Transfer sampai ✓", buttons: ["Lihat rincian", "Tandai dibaca"], rows: [{ label: "Ke Ibu · Wonosobo", value: "Rp 1.842.500" }, { label: "Diklaim", value: "3 detik lalu" }] },
  },
  {
    Icon: EyeIcon, title: "Terlindungi 24/7", copy: "Setiap transaksi tercatat publik di jaringan Stellar yang teraudit.",
    gradient: "linear-gradient(160deg,#5a8a4a,#1e3b17 70%)",
    panel: { cardLabel: "Jaringan Stellar", cardValue: "Tercatat publik", buttons: ["Lihat ledger", "Verifikasi"], rows: [{ label: "Hash transaksi", value: "a3f9…c21e" }, { label: "Status", value: "Final · teraudit" }] },
  },
  {
    Icon: ShieldIcon, title: "Kendali penuh di tanganmu", copy: "Non-custodial: tidak ada yang bisa menyentuh uangmu, bahkan Sangu.",
    gradient: "linear-gradient(160deg,#7a5a8a,#2d173b 70%)",
    panel: { cardLabel: "Kustodian", cardValue: "Tidak ada", buttons: ["Kunci milikmu", "Ekspor akun"], rows: [{ label: "Akses Sangu ke danamu", value: "0%" }, { label: "Akses kamu", value: "100%" }] },
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
        <p className={styles.secLegal}>Sangu adalah aplikasi non-custodial di jaringan Stellar. Kunci tersimpan sebagai passkey di perangkatmu dan tidak pernah menyentuh server kami. Versi demo — bukan layanan keuangan berizin.</p>
      </div>
      <div key={active} className={styles.secVisual} style={{ background: row.gradient }}>
        <div className={styles.secPanel}>
          <div className={styles.secPanelCard}>
            <span className={styles.secPanelLock}><row.Icon /></span>
            <div><small style={{ opacity: .75 }}>{row.panel.cardLabel}</small><br /><strong>{row.panel.cardValue}</strong></div>
          </div>
          <div className={styles.secPanelBtns}>{row.panel.buttons.map((b) => <span key={b}>{b}</span>)}</div>
          {row.panel.rows.map((r) => <div key={r.label} className={styles.secPanelRow}><small>{r.label}</small>{r.value}</div>)}
        </div>
      </div>
    </div>
  </section>;
}
