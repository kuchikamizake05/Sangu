"use client";

import Image from "next/image";
import { useT } from "@/lib/i18n/locale-context";
import styles from "./landing.module.css";
import { Reveal } from "./reveal";
import qrImg from "@/asset/qr-web/qr-sangu.png";

export function DownloadCta() {
  const t = useT();
  return <section className={styles.section}>
    <div className={styles.container}>
      <Reveal>
        <div className={styles.download}>
          <div className={styles.downloadCopy}>
            <h2 className={styles.sectionTitle}>{t("landing.downloadCta.title")}</h2>
            <p className={styles.sectionSub}>{t("landing.downloadCta.sub")}</p>
            <div className={styles.downloadBadges}>
              <a className={styles.storeBadge} href="/app"><span><small>{t("landing.downloadCta.badges.browserSmall")}</small><strong>{t("landing.downloadCta.badges.browser")}</strong></span></a>
              <a className={styles.storeBadge} href="/app"><span><small>{t("landing.downloadCta.badges.appStoreSmall")}</small><strong>{t("landing.downloadCta.badges.appStore")}</strong></span></a>
              <a className={styles.storeBadge} href="/app"><span><small>{t("landing.downloadCta.badges.googlePlaySmall")}</small><strong>{t("landing.downloadCta.badges.googlePlay")}</strong></span></a>
            </div>
            <div className={styles.heroCtas} style={{ justifyContent: "flex-start", marginTop: 24 }}>
              <a className={`${styles.pill} ${styles.pillLarge}`} href="/app">{t("landing.downloadCta.ctaPrimary")}</a>
            </div>
          </div>
          <figure className={styles.qrCard}>
            <a href="/app" aria-label={t("landing.downloadCta.qrAria")}>
              <Image className={styles.qrImg} src={qrImg} alt={t("landing.downloadCta.qrAlt")} width={230} height={230} priority />
            </a>
            <figcaption>{t("landing.downloadCta.qrCaption")}</figcaption>
          </figure>
        </div>
      </Reveal>
    </div>
  </section>;
}
