"use client";

import { use, useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, TextInput } from "@/components/ui/field";
import { StatusBadge } from "@/components/ui/status-badge";
import { getClaim, payout, requestOtp, verifyOtp, type ClaimInfo, type PayoutMethod, type PayoutResponse } from "@/lib/api";

type Screen = "summary" | "otp" | "payout" | "result";
const choices: Array<{ value: PayoutMethod; title: string; detail: string; needsAccount?: boolean }> = [
  { value: "dana", title: "DANA", detail: "Masuk ke nomor DANA penerima", needsAccount: true },
  { value: "gopay", title: "GoPay", detail: "Masuk ke nomor GoPay penerima", needsAccount: true },
  { value: "bank", title: "Transfer bank", detail: "Masuk ke rekening pilihanmu", needsAccount: true },
  { value: "cash", title: "Ambil tunai di gerai", detail: "Cukup tunjukkan kode dan KTP" },
];

export default function ClaimPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [info, setInfo] = useState<ClaimInfo | null>(null);
  const [screen, setScreen] = useState<Screen>("summary");
  const [otp, setOtp] = useState("");
  const [method, setMethod] = useState<PayoutMethod>("cash");
  const [account, setAccount] = useState("");
  const [result, setResult] = useState<PayoutResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendSeconds, setResendSeconds] = useState(0);
  const [claimSession, setClaimSession] = useState("");

  useEffect(() => { getClaim(token).then(setInfo).catch(() => setError("Link ini tidak dapat dibuka. Periksa lagi pesan yang kamu terima.")); }, [token]);
  useEffect(() => {
    if (resendSeconds === 0) return;
    const timer = window.setInterval(() => setResendSeconds((seconds) => Math.max(0, seconds - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [resendSeconds]);

  async function beginOtp() {
    setBusy(true); setError(null);
    try { await requestOtp(token); setScreen("otp"); setResendSeconds(60); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Kode OTP belum dapat dikirim."); }
    finally { setBusy(false); }
  }

  async function confirmOtp() {
    if (!/^\d{6}$/.test(otp)) { setError("Masukkan 6 angka dari SMS."); return; }
    setBusy(true); setError(null);
    try { const verified = await verifyOtp(token, otp); setClaimSession(verified.claimSession); setScreen("payout"); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Kode OTP tidak cocok."); }
    finally { setBusy(false); }
  }

  async function claim() {
    const selected = choices.find((item) => item.value === method);
    if (selected?.needsAccount && !account.trim()) { setError("Masukkan nomor tujuan pencairan."); return; }
    setBusy(true); setError(null);
    try { setResult(await payout(token, method, claimSession, account ? { account } : {})); setScreen("result"); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Pencairan belum dapat diproses."); }
    finally { setBusy(false); }
  }

  if (!info) return <AppShell mode="claim"><Card className="mx-auto max-w-md text-center text-muted">{error ?? "Memuat kirimanmu…"}</Card></AppShell>;
  if (info.status !== "PENDING") return <ClosedClaim status={info.status} />;
  const selected = choices.find((item) => item.value === method)!;

  return <AppShell mode="claim"><Card className="mx-auto max-w-md !p-6 sm:!p-8"><StatusBadge status={info.status} />
    {screen === "summary" && <section className="mt-7 text-center"><p className="text-lg text-muted">{info.senderName} mengirimimu</p><h1 className="mt-2 text-5xl font-extrabold tracking-[-.07em] sm:text-6xl">Rp {Number(info.amountIdr).toLocaleString("id-ID")}</h1><p className="mx-auto mt-5 max-w-xs text-sm text-muted">Cairkan dengan aman. Kamu tidak perlu punya akun Sangu atau dompet kripto.</p><Button className="mt-8" fullWidth onClick={beginOtp} disabled={busy}>{busy ? "Mengirim kode…" : "Cairkan sekarang"}</Button></section>}
    {screen === "otp" && <OtpScreen otp={otp} busy={busy} resendSeconds={resendSeconds} onOtpChange={setOtp} onConfirm={confirmOtp} onResend={beginOtp} />}
    {screen === "payout" && <PayoutScreen account={account} busy={busy} method={method} selected={selected} onAccountChange={setAccount} onClaim={claim} onMethodChange={setMethod} />}
    {screen === "result" && result && <ResultScreen amountIdr={info.amountIdr} method={method} result={result} token={token} />}
    {error && <p className="mt-5 text-sm font-semibold text-danger" role="alert">{error}</p>}
  </Card></AppShell>;
}

function ClosedClaim({ status }: { status: Exclude<ClaimInfo["status"], "PENDING"> }) {
  const message = { CLAIMED: "Pencairan sedang diproses.", PAID_OUT: "Uang ini sudah dicairkan.", REFUNDED: "Dana kiriman telah dikembalikan.", EXPIRED: "Transfer ini sudah kedaluwarsa." }[status];
  return <AppShell mode="claim"><Card className="mx-auto max-w-md !p-6 text-center sm:!p-8"><StatusBadge status={status} /><h1 className="mt-6 text-3xl font-extrabold tracking-[-.05em]">{message}</h1><p className="mx-auto mt-3 max-w-xs text-sm text-muted">Jika kamu membutuhkan bantuan terkait kiriman ini, hubungi pengirim atau tim Sangu.</p></Card></AppShell>;
}

function OtpScreen({ otp, busy, resendSeconds, onOtpChange, onConfirm, onResend }: { otp: string; busy: boolean; resendSeconds: number; onOtpChange: (value: string) => void; onConfirm: () => void; onResend: () => void }) {
  const isCoolingDown = resendSeconds > 0;
  return <section className="mt-7"><p className="text-xs font-extrabold tracking-[.15em] text-brand-deep">LANGKAH KEAMANAN</p><h1 className="mt-2 text-3xl font-extrabold tracking-[-.05em]">Masukkan kode SMS</h1><p className="mt-2 text-sm text-muted">Kode 6 angka sudah dikirim ke nomor penerima yang terdaftar.</p><div className="mt-7"><Field label="Kode OTP"><TextInput aria-label="Kode OTP" inputMode="numeric" maxLength={6} placeholder="123456" value={otp} onChange={(event) => onOtpChange(event.target.value.replace(/\D/g, ""))} /></Field></div><Button className="mt-5" fullWidth onClick={onConfirm} disabled={busy}>{busy ? "Memverifikasi…" : "Verifikasi kode"}</Button>{isCoolingDown && <p className="mt-3 text-center text-xs font-semibold text-muted" role="status" aria-live="polite">Kirim ulang tersedia dalam {resendSeconds} detik.</p>}<Button className="mt-2" fullWidth variant="ghost" onClick={onResend} disabled={busy || isCoolingDown}>{isCoolingDown ? `Kirim ulang dalam ${resendSeconds} dtk` : "Kirim ulang kode"}</Button></section>;
}

function PayoutScreen({ account, busy, method, selected, onAccountChange, onClaim, onMethodChange }: { account: string; busy: boolean; method: PayoutMethod; selected: (typeof choices)[number]; onAccountChange: (value: string) => void; onClaim: () => void; onMethodChange: (method: PayoutMethod) => void }) {
  return <section className="mt-7"><p className="text-xs font-extrabold tracking-[.15em] text-brand-deep">OTP TERVERIFIKASI</p><h1 className="mt-2 text-3xl font-extrabold tracking-[-.05em]">Pilih cara mencairkan</h1><div className="mt-6 grid gap-3" role="group" aria-label="Metode pencairan">{choices.map((choice) => <button key={choice.value} onClick={() => onMethodChange(choice.value)} aria-pressed={method === choice.value} className={`rounded-2xl border p-4 text-left transition ${method === choice.value ? "border-brand bg-peach" : "border-line hover:border-ink"}`}><strong className="block">{choice.value === "cash" ? "☆ " : ""}{choice.title}</strong><span className="mt-1 block text-sm text-muted">{choice.detail}</span></button>)}</div>{selected.needsAccount && <div className="mt-5"><Field label={method === "bank" ? "Nomor rekening" : `Nomor ${selected.title}`}><TextInput inputMode="numeric" value={account} onChange={(event) => onAccountChange(event.target.value)} placeholder="Masukkan nomor tujuan" /></Field></div>}<Button className="mt-6" fullWidth onClick={onClaim} disabled={busy}>{busy ? "Memproses pencairan…" : "Cairkan uang"}</Button></section>;
}

function ResultScreen({ amountIdr, method, result, token }: { amountIdr: string; method: PayoutMethod; result: PayoutResponse; token: string }) {
  const [copyStatus, setCopyStatus] = useState<"success" | "error" | null>(null);
  const [completed, setCompleted] = useState(false);
  const isCash = Boolean(result.cashCode);

  // Poll status sampai backend selesai membayar anchor → transisi ke layar sukses.
  // Berhenti sendiri setelah ~2 menit; kalau belum juga, biarkan di "diproses" (jujur).
  useEffect(() => {
    if (isCash || completed) return;
    let attempts = 0;
    const timer = window.setInterval(async () => {
      attempts += 1;
      try {
        const latest = await getClaim(token);
        if (latest.payoutCompleted) { setCompleted(true); window.clearInterval(timer); }
      } catch { /* transien — coba lagi di tick berikutnya */ }
      if (attempts >= 30) window.clearInterval(timer);
    }, 4000);
    return () => window.clearInterval(timer);
  }, [isCash, completed, token]);

  async function copyCashCode() {
    try {
      if (!navigator.clipboard?.writeText || !result.cashCode) throw new Error("Clipboard tidak tersedia");
      await navigator.clipboard.writeText(result.cashCode);
      setCopyStatus("success");
    } catch {
      setCopyStatus("error");
    }
  }

  const methodLabel = choices.find((choice) => choice.value === method)?.title ?? method;
  return <section className="mt-7 text-center" aria-live="polite">
    <span className={`inline-flex size-12 items-center justify-center rounded-full text-xl font-extrabold ${!isCash && !completed ? "bg-peach-wash text-brand-deep" : "bg-success-wash text-success"}`}>{!isCash && !completed ? "⋯" : "✓"}</span>
    {isCash ? <>
      <p className="mt-5 text-xs font-extrabold tracking-[.15em] text-brand-deep">KODE PENARIKAN</p>
      <h1 className="mt-2 text-3xl font-extrabold tracking-[.08em]">{result.cashCode}</h1>
      <Button className="mt-4" variant="secondary" onClick={copyCashCode}>Salin kode</Button>
      {copyStatus && <p className={`mt-3 text-sm font-semibold ${copyStatus === "success" ? "text-success" : "text-danger"}`} role="status">{copyStatus === "success" ? "Kode penarikan disalin." : "Kode belum dapat disalin. Salin manual kode di atas."}</p>}
      <p className="mx-auto mt-3 max-w-xs text-sm text-muted">{result.instructions ?? "Kami sedang memproses pencairanmu."}</p>
    </> : completed ? <>
      <h1 className="mt-5 text-3xl font-extrabold tracking-[-.05em]">Dana sudah masuk 🎉</h1>
      <p className="mt-3 text-sm font-semibold text-ink">Rp {Number(amountIdr).toLocaleString("id-ID")} dikirim ke {methodLabel}</p>
      <p className="mx-auto mt-3 max-w-xs text-sm text-muted">Pencairan selesai. Kamu bisa menutup halaman ini.</p>
    </> : <>
      <h1 className="mt-5 text-3xl font-extrabold tracking-[-.05em]">Pencairan diproses</h1>
      <p className="mt-3 text-sm font-semibold text-ink">Rp {Number(amountIdr).toLocaleString("id-ID")} melalui {methodLabel}</p>
      <p className="mx-auto mt-3 max-w-xs text-sm text-muted">{result.instructions ?? "Kami sedang memproses pencairanmu."}</p>
    </>}
    {result.simulatedPayout && <p className="mt-4 rounded-xl bg-peach-wash p-3 text-xs text-brand-deep">Demo: pencairan akhir masih disimulasikan.</p>}
  </section>;
}
