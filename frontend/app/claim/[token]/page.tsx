"use client";

import { use, useEffect, useState } from "react";
import { AppShell, CardBrand } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, TextInput } from "@/components/ui/field";
import { StatusBadge } from "@/components/ui/status-badge";
import { getClaim, payout, requestOtp, verifyOtp, type ClaimInfo, type PayoutMethod, type PayoutResponse } from "@/lib/api";
import { useIntlLocale, useT } from "@/lib/i18n/locale-context";

type Screen = "summary" | "otp" | "payout" | "result";
type Choice = { value: PayoutMethod; title: string; detail: string; needsAccount?: boolean };

function buildChoices(t: (key: string) => string): Choice[] {
  return [
    { value: "dana", title: t("claim.danaTitle"), detail: t("claim.danaDetail"), needsAccount: true },
    { value: "gopay", title: t("claim.gopayTitle"), detail: t("claim.gopayDetail"), needsAccount: true },
    { value: "bank", title: t("claim.bankTitle"), detail: t("claim.bankDetail"), needsAccount: true },
    { value: "cash", title: t("claim.cashTitle"), detail: t("claim.cashDetail") },
  ];
}

export default function ClaimPage({ params }: { params: Promise<{ token: string }> }) {
  const t = useT();
  const intlLocale = useIntlLocale();
  const choices = buildChoices(t);
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

  useEffect(() => { getClaim(token).then(setInfo).catch(() => setError(t("claim.linkUnreachable"))); }, [token]);
  useEffect(() => {
    if (resendSeconds === 0) return;
    const timer = window.setInterval(() => setResendSeconds((seconds) => Math.max(0, seconds - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [resendSeconds]);

  async function beginOtp() {
    setBusy(true); setError(null);
    try { await requestOtp(token); setScreen("otp"); setResendSeconds(60); }
    catch (reason) { setError(reason instanceof Error ? reason.message : t("claim.otpNotSent")); }
    finally { setBusy(false); }
  }

  async function confirmOtp() {
    if (!/^\d{6}$/.test(otp)) { setError(t("claim.otpFormatError")); return; }
    setBusy(true); setError(null);
    try { const verified = await verifyOtp(token, otp); setClaimSession(verified.claimSession); setScreen("payout"); }
    catch (reason) { setError(reason instanceof Error ? reason.message : t("claim.otpMismatch")); }
    finally { setBusy(false); }
  }

  async function claim() {
    const selected = choices.find((item) => item.value === method);
    if (selected?.needsAccount && !account.trim()) { setError(t("claim.accountRequired")); return; }
    setBusy(true); setError(null);
    try { setResult(await payout(token, method, claimSession, account ? { account } : {})); setScreen("result"); }
    catch (reason) { setError(reason instanceof Error ? reason.message : t("claim.payoutError")); }
    finally { setBusy(false); }
  }

  if (!info) return <AppShell mode="claim"><Card className="mx-auto max-w-md text-center text-muted"><CardBrand />{error ?? t("claim.loadingClaim")}</Card></AppShell>;
  if (info.status !== "PENDING") return <ClosedClaim status={info.status} />;
  const selected = choices.find((item) => item.value === method)!;

  return <AppShell mode="claim"><Card className="mx-auto max-w-md !p-6 sm:!p-8"><CardBrand />
    {screen === "summary" && <section className="mt-7 text-center"><p className="text-lg text-muted">{info.senderName} {t("claim.sentTo")}</p><h1 className="mt-2 text-5xl font-extrabold tracking-[-.07em] sm:text-6xl">Rp {Number(info.amountIdr).toLocaleString(intlLocale)}</h1><p className="mx-auto mt-5 max-w-xs text-sm text-muted">{t("claim.claimSafeNote")}</p><Button className="mt-8" fullWidth onClick={beginOtp} disabled={busy}>{busy ? t("claim.sendingCode") : t("claim.claimNow")}</Button></section>}
    {screen === "otp" && <OtpScreen otp={otp} busy={busy} resendSeconds={resendSeconds} onOtpChange={setOtp} onConfirm={confirmOtp} onResend={beginOtp} />}
    {screen === "payout" && <PayoutScreen account={account} busy={busy} method={method} selected={selected} choices={choices} onAccountChange={setAccount} onClaim={claim} onMethodChange={setMethod} />}
    {screen === "result" && result && <ResultScreen amountIdr={info.amountIdr} method={method} result={result} token={token} choices={choices} />}
    {error && <p className="mt-5 text-sm font-semibold text-danger" role="alert">{error}</p>}
  </Card></AppShell>;
}

function ClosedClaim({ status }: { status: Exclude<ClaimInfo["status"], "PENDING"> }) {
  const t = useT();
  const message = { CLAIMED: t("claim.closedClaimed"), PAID_OUT: t("claim.closedPaidOut"), REFUNDED: t("claim.closedRefunded"), EXPIRED: t("claim.closedExpired") }[status];
  return <AppShell mode="claim"><Card className="mx-auto max-w-md !p-6 text-center sm:!p-8"><CardBrand /><StatusBadge status={status} /><h1 className="mt-6 text-3xl font-extrabold tracking-[-.05em]">{message}</h1><p className="mx-auto mt-3 max-w-xs text-sm text-muted">{t("claim.closedHelp")}</p></Card></AppShell>;
}

function OtpScreen({ otp, busy, resendSeconds, onOtpChange, onConfirm, onResend }: { otp: string; busy: boolean; resendSeconds: number; onOtpChange: (value: string) => void; onConfirm: () => void; onResend: () => void }) {
  const t = useT();
  const isCoolingDown = resendSeconds > 0;
  return <section className="mt-7"><p className="text-xs font-extrabold tracking-[.15em] text-brand-deep">{t("claim.securityStep")}</p><h1 className="mt-2 text-3xl font-extrabold tracking-[-.05em]">{t("claim.enterSmsCode")}</h1><p className="mt-2 text-sm text-muted">{t("claim.smsCodeSentNote")}</p><div className="mt-7"><Field label={t("claim.otpFieldLabel")}><TextInput aria-label={t("claim.otpFieldLabel")} inputMode="numeric" maxLength={6} placeholder="000000" value={otp} onChange={(event) => onOtpChange(event.target.value.replace(/\D/g, ""))} /></Field></div><Button className="mt-5" fullWidth onClick={onConfirm} disabled={busy}>{busy ? t("claim.verifying") : t("claim.verifyCode")}</Button>{isCoolingDown && <p className="mt-3 text-center text-xs font-semibold text-muted" role="status" aria-live="polite">{t("claim.resendAvailablePrefix")} {resendSeconds} {t("claim.secondsSuffix")}</p>}<Button className="mt-2" fullWidth variant="ghost" onClick={onResend} disabled={busy || isCoolingDown}>{isCoolingDown ? `${t("claim.resendCountingPrefix")} ${resendSeconds} ${t("claim.dtkSuffix")}` : t("claim.resendCode")}</Button></section>;
}

function PayoutScreen({ account, busy, method, selected, choices, onAccountChange, onClaim, onMethodChange }: { account: string; busy: boolean; method: PayoutMethod; selected: Choice; choices: Choice[]; onAccountChange: (value: string) => void; onClaim: () => void; onMethodChange: (method: PayoutMethod) => void }) {
  const t = useT();
  return <section className="mt-7"><p className="text-xs font-extrabold tracking-[.15em] text-brand-deep">{t("claim.otpVerified")}</p><h1 className="mt-2 text-3xl font-extrabold tracking-[-.05em]">{t("claim.chooseMethod")}</h1><div className="mt-6 grid gap-3" role="group" aria-label={t("claim.payoutMethodAria")}>{choices.map((choice) => <button key={choice.value} onClick={() => onMethodChange(choice.value)} aria-pressed={method === choice.value} className={`rounded-2xl border p-4 text-left transition ${method === choice.value ? "border-brand bg-peach" : "border-line hover:border-ink"}`}><strong className="block">{choice.title}</strong><span className="mt-1 block text-sm text-muted">{choice.detail}</span></button>)}</div>{selected.needsAccount && <div className="mt-5"><Field label={method === "bank" ? t("claim.bankAccountNumber") : `${t("claim.accountNumberPrefix")} ${selected.title}`}><TextInput inputMode="numeric" value={account} onChange={(event) => onAccountChange(event.target.value)} placeholder={t("claim.accountPlaceholder")} /></Field></div>}<Button className="mt-6" fullWidth onClick={onClaim} disabled={busy}>{busy ? t("claim.processingPayout") : t("claim.withdrawMoney")}</Button></section>;
}

function ResultScreen({ amountIdr, method, result, token, choices }: { amountIdr: string; method: PayoutMethod; result: PayoutResponse; token: string; choices: Choice[] }) {
  const t = useT();
  const intlLocale = useIntlLocale();
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
    <span className={`inline-flex size-12 items-center justify-center rounded-full text-xl font-extrabold text-white ${!isCash && !completed ? "bg-warning" : "bg-success"}`}>{!isCash && !completed ? "⋯" : "✓"}</span>
    {isCash ? <>
      <p className="mt-5 text-xs font-extrabold tracking-[.15em] text-brand-deep">{t("claim.withdrawalCode")}</p>
      <h1 className="mt-2 whitespace-nowrap text-2xl font-extrabold tracking-[.06em] sm:text-3xl">{result.cashCode}</h1>
      <Button className="mt-4" variant="secondary" onClick={copyCashCode}>{t("claim.copyCode")}</Button>
      {copyStatus && <p className={`mt-3 text-sm font-semibold ${copyStatus === "success" ? "text-success" : "text-danger"}`} role="status">{copyStatus === "success" ? t("claim.codeCopied") : t("claim.codeCopyFailed")}</p>}
      <p className="mx-auto mt-3 max-w-xs text-sm text-muted">{result.instructions ?? t("claim.processingFallback")}</p>
    </> : completed ? <>
      <h1 className="mt-5 text-3xl font-extrabold tracking-[-.05em]">{t("claim.fundsArrived")}</h1>
      <p className="mt-3 text-sm font-semibold text-ink">Rp {Number(amountIdr).toLocaleString(intlLocale)} {t("claim.sentToMethod")} {methodLabel}</p>
      <p className="mx-auto mt-3 max-w-xs text-sm text-muted">{t("claim.payoutCompleteNote")}</p>
    </> : <>
      <h1 className="mt-5 text-3xl font-extrabold tracking-[-.05em]">{t("claim.payoutProcessing")}</h1>
      <p className="mt-3 text-sm font-semibold text-ink">Rp {Number(amountIdr).toLocaleString(intlLocale)} {t("claim.viaMethod")} {methodLabel}</p>
      <p className="mx-auto mt-3 max-w-xs text-sm text-muted">{result.instructions ?? t("claim.processingFallback")}</p>
    </>}
    {result.simulatedPayout && <p className="mt-4 rounded-xl bg-peach-wash p-3 text-xs text-brand-deep">{t("claim.demoNote")}</p>}
  </section>;
}
