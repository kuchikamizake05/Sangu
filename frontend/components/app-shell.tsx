"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import styles from "./app-shell.module.css";
import { ActivityIcon, CalendarIcon, HomeIcon, SendIcon, UserIcon } from "./ui/icons";

type AppShellProps = {
  children: ReactNode;
  mode?: "sender" | "claim";
  variant?: "default" | "bare";
};

const navigation = [
  { href: "/app", label: "Beranda", Icon: HomeIcon },
  { href: "/transfers", label: "Aktivitas", Icon: ActivityIcon },
  { href: "/recurring", label: "Bulanan", Icon: CalendarIcon },
  { href: "/account", label: "Akun", Icon: UserIcon },
];

function Brand() {
  return <a className={styles.brand} href="/app" aria-label="Sangu beranda">sangu<span>·</span></a>;
}

/** Logo untuk halaman penerima — ditaruh DI DALAM card (bukan navbar), penerima tak punya akun untuk dituju. */
export function CardBrand() {
  return <p className={`${styles.brand} ${styles.cardBrand}`} aria-label="Sangu">sangu<span>·</span></p>;
}

function isCurrentPath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function TabBar({ pathname }: { pathname: string }) {
  return (
    <nav className={styles.tabBar} aria-label="Navigasi aplikasi">
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
  const primaryNav = navigation.filter((item) => item.href !== "/account");
  const accountNav = navigation.filter((item) => item.href === "/account");

  return (
    <nav className={styles.sidebar} aria-label="Navigasi aplikasi (desktop)">
      <a className={`${styles.brand} ${styles.sidebarBrand}`} href="/app" aria-label="Sangu beranda">sangu<span>·</span></a>
      {primaryNav.map(({ href, label, Icon }) => (
        <a key={href} href={href} aria-current={isCurrentPath(pathname, href) ? "page" : undefined} className={styles.sideItem}>
          <Icon className={styles.sideIcon} />
          <span>{label}</span>
        </a>
      ))}
      <a href="/send" className={styles.sideCta}>
        <SendIcon className={styles.sideIcon} />
        <span>Kirim</span>
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
