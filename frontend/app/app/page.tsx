"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { TransferHub } from "@/components/sender/transfer-hub";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getAuthToken } from "@/lib/auth-session";

export default function SenderPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    if (!getAuthToken()) { router.replace("/login?next=%2Fapp"); setIsAuthenticated(false); return; }
    setIsAuthenticated(true);
  }, [router]);

  if (isAuthenticated !== true) return null;

  return <AppShell><div className="mx-auto max-w-2xl pb-12"><section className="mb-8 grid gap-4 sm:grid-cols-[1.3fr_.7fr]"><Card className="!bg-[#080808] !text-white"><p className="text-sm text-white/60">Saldo tersedia</p><p className="mt-2 text-4xl font-extrabold tracking-[-.06em]">RM 1,840.00</p><p className="mt-5 text-sm text-white/65">≈ Rp 6.750.000 · saldo demo</p></Card><Card className="flex flex-col justify-between"><p className="font-bold">Kirim pulang</p><p className="my-3 text-sm text-[#676767]">Buat link aman untuk keluarga.</p><a className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#ff5113] px-5 py-3 text-sm font-extrabold text-[#080808] no-underline hover:bg-[#ff7437]" href="/send">Kirim uang</a></Card></section><TransferHub onStartTransfer={() => { window.location.assign("/send"); }} historyMode="preview" viewHistoryHref="/transfers" /></div></AppShell>;
}
