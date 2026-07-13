import styles from "./landing.module.css";

const PARTNERS = ["Stellar", "Soroban", "USDC", "Passkey", "SEP-24", "Anchor Network", "WebAuthn"];

export function Ticker() {
  return <section className={styles.tickerSection}>
    <h2 className={styles.tickerLabel}>Dibangun di atas rel yang terpercaya</h2>
    <div className={styles.ticker}>
      <div className={styles.tickerTrack}>
        {[0, 1].map((copy) => PARTNERS.map((name) => <span key={`${copy}-${name}`} className={styles.tickerItem} aria-hidden={copy === 1 || undefined}>{name}</span>))}
      </div>
    </div>
  </section>;
}
