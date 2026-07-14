"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useT } from "@/lib/i18n/locale-context";
import styles from "./app-shell.module.css";
import { ActivityIcon, CalendarIcon, HomeIcon, SendIcon, UserIcon } from "./ui/icons";

type AppShellProps = {
  children: ReactNode;
  mode?: "sender" | "claim";
  variant?: "default" | "bare";
};

type NavItem = { href: string; label: string; Icon: typeof HomeIcon };

function useNavigation(): NavItem[] {
  const t = useT();
  return [
    { href: "/app", label: t("common.navHome"), Icon: HomeIcon },
    { href: "/transfers", label: t("common.navActivity"), Icon: ActivityIcon },
    { href: "/recurring", label: t("common.navMonthly"), Icon: CalendarIcon },
    { href: "/account", label: t("common.navAccount"), Icon: UserIcon },
  ];
}

function Brand() {
  const t = useT();
  return <a className={styles.brand} href="/app" aria-label={t("common.brandAriaLabel")}>sangu<span>·</span></a>;
}

/** Logo untuk halaman penerima — ditaruh DI DALAM card (bukan navbar), penerima tak punya akun untuk dituju. */
export function CardBrand() {
  const t = useT();
  return <p className={`${styles.brand} ${styles.cardBrand}`} aria-label={t("common.brandOnlyAriaLabel")}>sangu<span>·</span></p>;
}

function isCurrentPath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function TabBar({ pathname }: { pathname: string }) {
  const t = useT();
  const navigation = useNavigation();
  return (
    <nav className={styles.tabBar} aria-label={t("common.navAriaLabel")}>
      {navigation.map(({ href, label, Icon }) => {
        const current = isCurrentPath(pathname, href);
        return (
          <a key={href} href={href} aria-current={current ? "page" : undefined} className={styles.tabItem}>
            <Icon className={styles.tabIcon} />
            <span>{label}</span>
          </a>
        );
      })}
    </nav>
  );
}

function Sidebar({ pathname }: { pathname: string }) {
  const t = useT();
  const navigation = useNavigation();
  const primaryNav = navigation.filter((item) => item.href !== "/account");
  const accountNav = navigation.filter((item) => item.href === "/account");

  return (
    <nav className={styles.sidebar} aria-label={t("common.navDesktopAriaLabel")}>
      <a className={`${styles.brand} ${styles.sidebarBrand}`} href="/app" aria-label={t("common.brandAriaLabel")}>sangu<span>·</span></a>
      {primaryNav.map(({ href, label, Icon }) => (
        <a key={href} href={href} aria-current={isCurrentPath(pathname, href) ? "page" : undefined} className={styles.sideItem}>
          <Icon className={styles.sideIcon} />
          <span>{label}</span>
        </a>
      ))}
      <a href="/send" className={styles.sideCta}>
        <SendIcon className={styles.sideIcon} />
        <span>{t("common.navSend")}</span>
      </a>
      <div className={styles.sideSpacer} />
      {accountNav.map(({ href, label, Icon }) => (
        <a key={href} href={href} aria-current={isCurrentPath(pathname, href) ? "page" : undefined} className={styles.sideItem}>
          <Icon className={styles.sideIcon} />
          <span>{label}</span>
        </a>
      ))}
    </nav>
  );
}

export function AppShell({ children, mode = "sender", variant = "default" }: AppShellProps) {
  const pathname = usePathname() ?? "/";

  if (mode === "claim") {
    return <main className={styles.claimPage} data-mode={mode}><div className={styles.claimContent}>{children}</div></main>;
  }

  if (variant === "bare") {
    return <main className={styles.barePage} data-mode={mode} data-variant={variant}><div className={styles.bareContent}>{children}</div></main>;
  }

  return <div className={styles.shell} data-mode={mode} data-variant={variant}>
    <Sidebar pathname={pathname} />
    <main className={styles.page}>
      <header className={styles.header}><Brand /></header>
      <div className={styles.content}>{children}</div>
      <TabBar pathname={pathname} />
    </main>
  </div>;
}
