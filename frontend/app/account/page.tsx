"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { AuthGuard } from "@/components/auth-guard";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getMe, type SenderProfile } from "@/lib/api";
import { clearSession, setWalletInfo } from "@/lib/auth-session";
import { registerPasskeyAndWallet } from "@/lib/passkey-wallet";

export default function AccountPage() {
  return <AuthGuard><AppShell><AccountContent /></AppShell></AuthGuard>;
}

function AccountContent() {
  const [profile, setProfile] = useState<(SenderProfile & { walletAddress: string | null }) | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getMe().then(setProfile).catch(() => setError("Profil belum dapat dimuat."));
  }, []);

  async function activatePasskey() {
    if (!profile) return;
    setBusy(true);
    setError(null);
    try {
      const { keyIdBase64, contractId } = await registerPasskeyAndWallet(profile.name);
      setWalletInfo({ keyId: keyIdBase64, walletAddress: contractId });
      const refreshed = await getMe();
      setProfile(refreshed);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sidik jari belum dapat diaktifkan.");
    } finally {
      setBusy(false);
    }
  }

  function logout() {
    clearSession();
    window.location.assign("/login");
  }

  if (!profile) return <div className="mx-auto max-w-2xl pb-12 text-sm text-muted">{error ?? "Memuat…"}</div>;

  return <div className="mx-auto max-w-2xl pb-12">
    <p className="text-xs font-extrabold tracking-[.15em] text-brand-deep">AKUN & KEAMANAN</p>
    <h1 className="mt-2 text-4xl font-extrabold tracking-[-.06em]">{profile.name}</h1>
    <p className="mt-3 max-w-xl text-muted">{profile.phoneMasked}</p>

    <Card className="mt-8">
      <p className="text-sm font-bold">Sidik jari</p>
      {profile.hasPasskey ? (
        <div className="mt-4 flex items-center justify-between gap-4 rounded-2xl bg-success-wash p-4">
          <div><strong className="block">Aktif ✓</strong><span className="text-sm text-success-ink">Tidak ada data rahasia yang disimpan di Sangu.</span></div>
          <span aria-label="Status aman">✓</span>
        </div>
      ) : (
        <>
          <p className="mt-2 text-sm text-muted">Aktifkan untuk masuk cepat dan mengonfirmasi transfer tanpa OTP.</p>
          <Button className="mt-4" fullWidth onClick={activatePasskey} disabled={busy}>{busy ? "Mengaktifkan…" : "Aktifkan sidik jari"}</Button>
        </>
      )}
      {error && <p className="mt-3 text-sm font-semibold text-danger" role="alert">{error}</p>}
    </Card>

    <Card className="mt-5">
      <p className="text-sm font-bold">Keluar dari akun ini</p>
      <p className="mt-2 text-sm text-muted">Kamu bisa masuk lagi kapan saja dengan nomor HP-mu.</p>
      <Button className="mt-5 !bg-danger !text-white" variant="secondary" fullWidth onClick={logout}>Keluar</Button>
    </Card>
  </div>;
}
