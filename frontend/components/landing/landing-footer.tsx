"use client";

import { LanguageToggle } from "@/components/language-toggle";
import { useT } from "@/lib/i18n/locale-context";
import styles from "./landing.module.css";

export function LandingFooter() {
  const t = useT();

  const columns = [
    {
      heading: t("footer.colProduct"),
      links: [
        { label: t("footer.linkSendMoney"), href: "/app" },
        { label: t("footer.linkMonthly"), href: "/recurring" },
        { label: t("footer.linkRates"), href: "#kurs" },
        { label: t("footer.linkSecurity"), href: "#keamanan" },
      ],
    },
    {
      heading: t("footer.colCompany"),
      links: [
        { label: t("footer.linkAbout"), href: "#" },
        { label: t("footer.linkBlog"), href: "#" },
        { label: t("footer.linkCareers"), href: "#" },
      ],
    },
    {
      heading: t("footer.colHelp"),
      links: [
        { label: t("footer.linkHelpCenter"), href: "#" },
        { label: t("footer.linkServiceStatus"), href: "#" },
        { label: t("footer.linkContact"), href: "#" },
      ],
    },
  ];

  return <footer className={styles.footer}>
    <div className={styles.container}>
      <div className={styles.footerGrid}>
        <div>
          <p className={styles.footerBrand}>sangu<span>·</span></p>
          <p className={styles.footerTagline}>{t("footer.tagline")}</p>
        </div>
        {columns.map((col) => <nav key={col.heading} className={styles.footerCol} aria-label={col.heading}>
          <h2>{col.heading}</h2>
          <ul>{col.links.map((link) => <li key={link.label}><a href={link.href}>{link.label}</a></li>)}</ul>
        </nav>)}
      </div>
      <div className={styles.footerLegal}>
        <p>{t("footer.legal")}</p>
        <LanguageToggle variant="footer" />
      </div>
    </div>
  </footer>;
}
