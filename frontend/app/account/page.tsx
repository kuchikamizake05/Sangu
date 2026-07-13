"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getMe, type SenderProfile } from "@/lib/api";
import { clearAuthToken } from "@/lib/auth-session";

export default function AccountPage() {
  const [profile, setProfile] = useState<SenderProfile | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { getMe().then(setProfile).catch(() => setError("Profil belum dapat dimuat.")); }, []);

  function logout() { clearAuthToken(); window.location.assign("/login"); }

  return <AppShell><div className="mx-auto max-w-2xl pb-12"><p className="text-xs font-extrabold tracking-[.15em] text-[#9e1d0e]">AKUN & KEAMANAN</p><h1 className="mt-2 text-4xl font-extrabold tracking-[-.06em]">Perangkatmu, kendalimu.</h1><p className="mt-3 max-w-xl text-[#676767]">Kelola akses dan keamanan akunmu di sini.</p>
    <Card className="mt-8"><p className="text-sm font-bold">Profil pengirim</p>{profile ? <div className="mt-4 rounded-2xl bg-[#fcfcfc] p-4"><strong className="block text-lg">{profile.name}</strong><span className="mt-1 block text-sm text-[#676767]">{profile.phoneMasked}</span></div> : <p className="mt-4 text-sm text-[#676767]">Memuat profil…</p>}</Card>
    <Card className="mt-5"><p className="text-sm font-bold">Akses perangkat</p><div className={`mt-4 flex items-center justify-between gap-4 rounded-2xl p-4 ${profile?.hasPasskey ? "bg-[#eaf8e8]" : "bg-[#fff4eb]"}`}><div><strong className="block">{profile?.hasPasskey ? "Sidik jari aktif" : "Sidik jari belum diaktifkan"}</strong><span className="text-sm text-[#676767]">{profile?.hasPasskey ? "Gunakan untuk masuk dan mengonfirmasi kiriman." : "Aktifkan setelah tersedia di perangkat ini."}</span></div><span aria-label={profile?.hasPasskey ? "Status aman" : "Status belum aktif"}>{profile?.hasPasskey ? "✓" : "!"}</span></div></Card>
    {error && <p className="mt-4 text-sm font-semibold text-[#c72307]" role="alert">{error}</p>}<Button className="mt-5" variant="secondary" fullWidth onClick={logout}>Keluar dari akun</Button></div></AppShell>;
}
