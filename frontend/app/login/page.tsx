"use client";

import { useState } from "react";
import { requestAuthOtp, verifyAuthOtp } from "@/lib/api";
import { saveAuthToken } from "@/lib/auth-session";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, TextInput } from "@/components/ui/field";

type LoginStage = "phone" | "otp" | "done";

export default function LoginPage() {
  const [stage, setStage] = useState<LoginStage>("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [senderName, setSenderName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendCode() {
    if (!/^\+\d{8,15}$/.test(phone)) { setError("Masukkan nomor WhatsApp dengan format internasional."); return; }
    setBusy(true); setError(null);
    try { await requestAuthOtp(phone); setStage("otp"); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Kode belum dapat dikirim."); }
    finally { setBusy(false); }
  }

  async function verifyCode() {
    if (!/^\d{6}$/.test(code)) { setError("Masukkan 6 angka dari SMS."); return; }
    setBusy(true); setError(null);
    try {
      const response = await verifyAuthOtp(phone, code, name || undefined);
      saveAuthToken(response.token);
      setSenderName(response.sender.name);
      setStage("done");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Kode belum dapat diverifikasi."); }
    finally { setBusy(false); }
  }

  return <main className="mx-auto flex min-h-screen max-w-lg items-center px-5 py-10"><section className="w-full"><a className="text-3xl font-extrabold tracking-[-.07em] text-[#080808] no-underline" href="/login">sangu<span className="text-[#ff5113]">·</span></a><p className="mt-8 text-xs font-extrabold tracking-[.16em] text-[#9e1d0e]">AKUN PENGIRIM</p><h1 className="mt-2 text-5xl font-extrabold leading-[.92] tracking-[-.07em]">Masuk, lalu kirim pulang.</h1><p className="mt-5 max-w-sm text-[#676767]">Nomor WhatsApp kamu membantu menjaga akun dan memulihkan akses bila perangkat berganti.</p>
    <Card className="mt-8">
      {stage === "phone" && <><Field label="Nomor WhatsApp" hint="Format internasional, mis. +60123456789"><TextInput aria-label="Nomor WhatsApp" inputMode="tel" autoComplete="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+60123456789" /></Field><Button className="mt-6" fullWidth onClick={sendCode} disabled={busy}>{busy ? "Mengirim kode…" : "Kirim kode"}</Button></>}
      {stage === "otp" && <><p className="text-lg font-extrabold">Masukkan kode SMS</p><p className="mt-1 text-sm text-[#676767]">Kode dikirim ke {phone}. Untuk mode demo, gunakan 000000.</p><div className="mt-5 grid gap-4"><Field label="Kode OTP"><TextInput aria-label="Kode OTP" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))} /></Field><Field label="Nama lengkap" hint="Diisi saat membuat akun baru"><TextInput value={name} onChange={(event) => setName(event.target.value)} /></Field></div><Button className="mt-6" fullWidth onClick={verifyCode} disabled={busy}>{busy ? "Memverifikasi…" : "Verifikasi dan lanjutkan"}</Button><Button className="mt-2" fullWidth variant="ghost" onClick={() => setStage("phone")}>Ubah nomor</Button></>}
      {stage === "done" && <><p className="text-xs font-extrabold tracking-[.15em] text-[#278f35]">AKUN SIAP</p><h2 className="mt-2 text-3xl font-extrabold tracking-[-.05em]">Halo, {senderName}</h2><p className="mt-2 text-sm text-[#676767]">Kamu sudah masuk. Aktifkan sidik jari saat perangkat keamanan tersedia.</p><a className="mt-6 inline-flex min-h-11 w-full items-center justify-center rounded-full bg-[#ff5113] px-5 py-3 text-sm font-extrabold text-[#080808] no-underline" href="/">Lanjut ke Beranda</a></>}
      {error && <p className="mt-4 text-sm font-semibold text-[#c72307]" role="alert">{error}</p>}
    </Card>
  </section></main>;
}
