import styles from "./landing.module.css";

export function LandingNav() {
  return <header className={styles.nav}>
    <a className={styles.brand} href="/" aria-label="Sangu beranda">sangu<span>·</span></a>
    <a className={styles.pill} href="/app">Buka app</a>
  </header>;
}
