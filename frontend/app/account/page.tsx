"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { AuthGuard } from "@/components/auth-guard";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LanguageToggle } from "@/components/language-toggle";
import { useT } from "@/lib/i18n/locale-context";
import { getMe, type SenderProfile } from "@/lib/api";
import { clearSession, setWalletInfo } from "@/lib/auth-session";
import { registerPasskeyAndWallet } from "@/lib/passkey-wallet";

export default function AccountPage() {
  return <AuthGuard><AppShell><AccountContent /></AppShell></AuthGuard>;
}

function AccountContent() {
  const t = useT();
  const [profile, setProfile] = useState<(SenderProfile & { walletAddress: string | null }) | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getMe().then(setProfile).catch(() => setError(t("account.loadError")));
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      setError(err instanceof Error ? err.message : t("account.passkeyError"));
    } finally {
      setBusy(false);
    }
  }

  function logout() {
    clearSession();
    window.location.assign("/login");
  }

  if (!profile) return <div className="mx-auto max-w-2xl pb-12 text-sm text-muted">{error ?? t("account.loading")}</div>;

  return <div className="mx-auto max-w-2xl pb-12">
    <p className="text-xs font-extrabold tracking-[.15em] text-brand-deep">{t("account.eyebrow")}</p>
    <h1 className="mt-2 text-4xl font-extrabold tracking-[-.06em]">{profile.name}</h1>
    <p className="mt-3 max-w-xl text-muted">{profile.phoneMasked}</p>

    <div className="lg:mt-8 lg:grid lg:grid-cols-2 lg:items-start lg:gap-5">
    <Card className="mt-8 lg:mt-0">
      <p className="text-sm font-bold">{t("account.passkeyTitle")}</p>
      {profile.hasPasskey ? (
        <div className="mt-4 flex items-center justify-between gap-4 rounded-2xl bg-success-wash p-4">
          <div><strong className="block">{t("account.passkeyActive")}</strong><span className="text-sm text-success-ink">{t("account.passkeyActiveNote")}</span></div>
          <span aria-label={t("account.passkeySecureAria")}>✓</span>
        </div>
      ) : (
        <>
          <p className="mt-2 text-sm text-muted">{t("account.passkeyPrompt")}</p>
          <Button className="mt-4" fullWidth onClick={activatePasskey} disabled={busy}>{busy ? t("account.passkeyActivating") : t("account.passkeyActivate")}</Button>
        </>
      )}
      {error && <p className="mt-3 text-sm font-semibold text-danger" role="alert">{error}</p>}
    </Card>

    <Card className="mt-5 lg:mt-0">
      <p className="text-sm font-bold">{t("settings.languageLabel")}</p>
      <p className="mt-2 text-sm text-muted">{t("settings.languageDescription")}</p>
      <LanguageToggle variant="settings" className="mt-4" />
    </Card>
    </div>

    <Card className="mt-5">
      <p className="text-sm font-bold">{t("account.logoutTitle")}</p>
      <p className="mt-2 text-sm text-muted">{t("account.logoutNote")}</p>
      <Button className="mt-5 !bg-danger !text-white" variant="secondary" fullWidth onClick={logout}>{t("account.logoutButton")}</Button>
    </Card>
  </div>;
}
