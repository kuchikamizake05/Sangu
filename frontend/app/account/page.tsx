import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function AccountPage() {
  return <AppShell><div className="mx-auto max-w-2xl pb-12"><p className="text-xs font-extrabold tracking-[.15em] text-[#9e1d0e]">AKUN & KEAMANAN</p><h1 className="mt-2 text-4xl font-extrabold tracking-[-.06em]">Perangkatmu, kendalimu.</h1><p className="mt-3 max-w-xl text-[#676767]">Passkey menjaga otorisasi transaksi tetap berada di perangkatmu.</p><Card className="mt-8"><p className="text-sm font-bold">Akses perangkat</p><div className="mt-4 flex items-center justify-between gap-4 rounded-2xl bg-[#eaf8e8] p-4"><div><strong className="block">Passkey siap digunakan</strong><span className="text-sm text-[#356f3b]">Tidak ada private key yang disimpan di Sangu.</span></div><span aria-label="Status aman">✓</span></div><Button className="mt-6" variant="secondary" fullWidth>Kelola perangkat</Button></Card><Card className="mt-5"><p className="text-sm font-bold">Butuh bantuan?</p><p className="mt-2 text-sm text-[#676767]">Kami membantu masalah claim, transfer, dan keamanan akun.</p><Button className="mt-5" variant="ghost">Buka bantuan</Button></Card></div></AppShell>;
}
