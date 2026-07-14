"use client";

import { useEffect, useState, type ReactNode } from "react";
import { getMe } from "@/lib/api";
import { getToken } from "@/lib/auth-session";

// Pakai window.location langsung (bukan next/navigation) supaya guard tidak bergantung
// pada App Router context — lebih sederhana untuk diuji dan konsisten dengan pola window.location
// yang sudah dipakai di halaman lain (mis. transaction-confirmation.tsx).
export function AuthGuard({ children }: { children: ReactNode }) {
  const [hasToken, setHasToken] = useState<boolean | null>(null);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      const next = `${window.location.pathname}${window.location.search}`;
      window.location.assign(`/login?next=${encodeURIComponent(next)}`);
      setHasToken(false);
      return;
    }
    setHasToken(true);
    // Muat profil di latar belakang — 401 otomatis ditangani authFetch (onUnauthorized).
    getMe().catch(() => undefined);
  }, []);

  if (!hasToken) return null;
  return <>{children}</>;
}
