"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import styles from "./app-shell.module.css";

type AppShellProps = {
  children: ReactNode;
  mode?: "sender" | "claim";
};

const navigation = [
  { href: "/app", label: "Beranda" },
  { href: "/transfers", label: "Riwayat" },
  { href: "/recurring", label: "Sangu Bulanan" },
  { href: "/account", label: "Akun" },
];

function Brand() {
  return <a className={styles.brand} href="/app" aria-label="Sangu beranda">sangu<span>·</span></a>;
}

function isCurrentPath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function Navigation({ className, pathname }: { className: string; pathname: string }) {
  return <nav className={className} aria-label="Navigasi aplikasi">
    {navigation.map((item) => <a key={item.href} href={item.href} aria-current={isCurrentPath(pathname, item.href) ? "page" : undefined}>{item.label}</a>)}
  </nav>;
}

export function AppShell({ children, mode = "sender" }: AppShellProps) {
  const pathname = usePathname() ?? "/";

  if (mode === "claim") {
    return <main className={styles.claimPage} data-mode={mode}><header className={styles.claimHeader}><Brand /></header><div className={styles.claimContent}>{children}</div></main>;
  }

  return <main className={styles.page} data-mode={mode}>
    <aside className={styles.sidebar}>
      <Brand />
      <p className={styles.rail}>Malaysia → Indonesia</p>
      <Navigation className={styles.desktopNav} pathname={pathname} />
      <a className={styles.sendLink} href="/send" aria-current={isCurrentPath(pathname, "/send") ? "page" : undefined}>Kirim uang</a>
    </aside>
    <section className={styles.workspace}>
      <header className={styles.mobileHeader}><Brand /><span className={styles.rail}>Malaysia → Indonesia</span></header>
      <div className={styles.content}>{children}</div>
      <Navigation className={styles.mobileNav} pathname={pathname} />
    </section>
  </main>;
}
