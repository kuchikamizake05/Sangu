import styles from "./landing.module.css";

const PARTNERS = ["Jaringan Stellar", "Stablecoin USDC", "Login Passkey", "Non-custodial"];
// Ulang tiap paruh agar baris selalu penuh melintang (tak numpuk di kiri).
const GROUP = [...PARTNERS, ...PARTNERS, ...PARTNERS];

export function Ticker() {
  return <section className={styles.tickerSection}>
    <h2 className={styles.tickerLabel}>Dibangun di atas rel yang terpercaya</h2>
    <div className={styles.ticker}>
      <div className={styles.tickerTrack}>
        {[0, 1].map((copy) => GROUP.map((name, i) => <span key={`${copy}-${i}`} className={styles.tickerItem} aria-hidden={copy === 1 || i >= PARTNERS.length || undefined}>{name}</span>))}
      </div>
    </div>
  </section>;
}
