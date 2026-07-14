import Image from "next/image";
import styles from "./landing.module.css";
import { Reveal } from "./reveal";
import qrImg from "@/asset/qr-web/qr-sangu.png";

export function DownloadCta() {
  return <section className={styles.section}>
    <div className={styles.container}>
      <Reveal>
        <div className={styles.download}>
          <div className={styles.downloadCopy}>
            <h2 className={styles.sectionTitle}>Mulai kirim sangu hari ini.</h2>
            <p className={styles.sectionSub}>Gratis, tanpa minimum, dan siap dalam dua menit. Scan kodenya atau langsung buka app di browser.</p>
            <div className={styles.downloadBadges}>
              <a className={styles.storeBadge} href="/app"><span><small>Langsung di</small><strong>Browser</strong></span></a>
              <a className={styles.storeBadge} href="/app"><span><small>Segera di</small><strong>App Store</strong></span></a>
              <a className={styles.storeBadge} href="/app"><span><small>Segera di</small><strong>Google Play</strong></span></a>
            </div>
            <div className={styles.heroCtas} style={{ justifyContent: "flex-start", marginTop: 24 }}>
              <a className={`${styles.pill} ${styles.pillLarge}`} href="/app">Buka akun gratis</a>
            </div>
          </div>
          <figure className={styles.qrCard}>
            <a href="/app" aria-label="Buka Sangu">
              <Image className={styles.qrImg} src={qrImg} alt="Kode QR untuk membuka Sangu" width={230} height={230} priority />
            </a>
            <figcaption>Scan untuk buka Sangu</figcaption>
          </figure>
        </div>
      </Reveal>
    </div>
  </section>;
}
