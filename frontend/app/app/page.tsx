"use client";

import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { TransferHub } from "@/components/sender/transfer-hub";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function SenderPage() {
  const [isOnboarded, setIsOnboarded] = useState(false);

  if (!isOnboarded) return <AppShell><section className="mx-auto max-w-lg py-10 sm:py-20"><p className="mb-3 text-xs font-extrabold tracking-[.18em] text-[#9e1d0e]">SANGU UNTUK PERANTAU</p><h1 className="max-w-md text-5xl font-extrabold leading-[.92] tracking-[-.07em] text-[#080808] sm:text-7xl">Uang pulang, tanpa urusan ribet.</h1><p className="mt-6 max-w-sm text-[#676767]">Masuk sekali dengan perangkatmu. Kunci tetap milikmu, bukan milik Sangu.</p><Card className="mt-10 !border-[#ff5113] !bg-[#ffe7d4]"><p className="text-sm font-bold">Akses aman di perangkat ini</p><p className="mt-2 text-sm text-[#676767]">Siapkan perangkat untuk mengonfirmasi transfer dengan passkey.</p><Button fullWidth className="mt-6" onClick={() => setIsOnboarded(true)}>Siapkan akses perangkat</Button></Card></section></AppShell>;

  return <AppShell><div className="mx-auto max-w-2xl pb-12"><section className="mb-8 grid gap-4 sm:grid-cols-[1.3fr_.7fr]"><Card className="!bg-[#080808] !text-white"><p className="text-sm text-white/60">Saldo tersedia</p><p className="mt-2 text-4xl font-extrabold tracking-[-.06em]">RM 1,840.00</p><p className="mt-5 text-sm text-white/65">≈ Rp 6.750.000 · saldo demo</p></Card><Card className="flex flex-col justify-between"><p className="font-bold">Kirim pulang</p><p className="my-3 text-sm text-[#676767]">Buat link aman untuk keluarga.</p><a className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#ff5113] px-5 py-3 text-sm font-extrabold text-[#080808] no-underline hover:bg-[#ff7437]" href="/send">Kirim uang</a></Card></section><TransferHub onStartTransfer={() => { window.location.assign("/send"); }} historyMode="preview" viewHistoryHref="/transfers" /></div></AppShell>;
}
