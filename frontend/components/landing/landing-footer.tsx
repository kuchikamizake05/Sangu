import styles from "./landing.module.css";

const COLUMNS = [
  { heading: "Produk", links: [{ label: "Kirim uang", href: "/app" }, { label: "Sangu Bulanan", href: "/recurring" }, { label: "Kurs", href: "#kurs" }, { label: "Keamanan", href: "#keamanan" }] },
  { heading: "Perusahaan", links: [{ label: "Tentang Sangu", href: "#" }, { label: "Blog", href: "#" }, { label: "Karier", href: "#" }] },
  { heading: "Bantuan", links: [{ label: "Pusat bantuan", href: "#" }, { label: "Status layanan", href: "#" }, { label: "Kontak", href: "#" }] },
];

export function LandingFooter() {
  return <footer className={styles.footer}>
    <div className={styles.container}>
      <div className={styles.footerGrid}>
        <div>
          <p className={styles.footerBrand}>sangu<span>·</span></p>
          <p className={styles.footerTagline}>Kirim pulang, semudah kirim pesan. Remittance non-custodial untuk perantau Indonesia, di jaringan Stellar.</p>
        </div>
        {COLUMNS.map((col) => <nav key={col.heading} className={styles.footerCol} aria-label={col.heading}>
          <h2>{col.heading}</h2>
          <ul>{col.links.map((link) => <li key={link.label}><a href={link.href}>{link.label}</a></li>)}</ul>
        </nav>)}
      </div>
      <div className={styles.footerLegal}>
        <p>© 2026 Sangu. Aplikasi non-custodial di jaringan Stellar — versi demo, bukan layanan keuangan berizin.</p>
        <p>Bahasa: Indonesia</p>
      </div>
    </div>
  </footer>;
}
