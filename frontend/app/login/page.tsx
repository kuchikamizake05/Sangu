"use client";

import { useEffect, useRef, useState, type ChangeEvent, type ClipboardEvent, type KeyboardEvent } from "react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, TextInput } from "@/components/ui/field";
import { ApiError, getPasskeyLoginOptions, requestAuthOtp, verifyAuthOtp, type SenderProfile } from "@/lib/api";
import { getLastPhone, setLastPhone, setSession, setWalletInfo } from "@/lib/auth-session";
import { isE164Phone } from "@/lib/send-flow";
import { loginWithPasskey, registerPasskeyAndWallet } from "@/lib/passkey-wallet";

type Step = "phone" | "otp" | "passkey-setup";

const RESEND_SECONDS = 60;

function redirectAfterLogin() {
  const params = new URLSearchParams(window.location.search);
  const next = params.get("next");
  const target = next && next.startsWith("/") ? next : "/app";
  window.location.assign(target);
}

function messageFor(error: unknown, fallback: string): string {
  if (error instanceof ApiError) return error.message || fallback;
  if (error instanceof Error) return error.message || fallback;
  return fallback;
}

export default function LoginPage() {
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [sender, setSender] = useState<SenderProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [busyLabel, setBusyLabel] = useState("Memproses…");
  const [showSmsFallback, setShowSmsFallback] = useState(false);
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    const stored = getLastPhone();
    if (stored) setPhone(stored);
  }, []);

  useEffect(() => {
    if (step !== "otp" || resendIn <= 0) return;
    const timer = window.setInterval(() => setResendIn((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [step, resendIn]);

  async function sendOtp() {
    try {
      await requestAuthOtp(phone);
      setLastPhone(phone);
      setStep("otp");
      setResendIn(RESEND_SECONDS);
      setError(null);
    } catch (err) {
      setError(messageFor(err, "Kode OTP belum dapat dikirim."));
    }
  }

  async function handleContinue() {
    if (!isE164Phone(phone)) {
      setError("Masukkan nomor HP dengan format internasional, mis. +60 / +852 / +62…");
      return;
    }
    setError(null);
    setShowSmsFallback(false);
    setBusy(true);
    setBusyLabel("Memeriksa akun…");
    try {
      await getPasskeyLoginOptions(phone);
      setBusyLabel("Masuk dengan sidik jari…");
      const { token, sender: loggedInSender } = await loginWithPasskey(phone);
      setSession({ token, sender: loggedInSender });
      setLastPhone(phone);
      afterAuthSuccess(loggedInSender);
    } catch (err) {
      if (err instanceof ApiError && err.code === "SENDER_NOT_FOUND") {
        await sendOtp();
      } else {
        setError(messageFor(err, "Masuk dengan sidik jari belum berhasil."));
        setShowSmsFallback(true);
      }
    } finally {
      setBusy(false);
    }
  }

  function afterAuthSuccess(profile: SenderProfile) {
    if (!profile.hasPasskey) {
      setSender(profile);
      setStep("passkey-setup");
      return;
    }
    redirectAfterLogin();
  }

  async function handleVerifyOtp() {
    if (code.length !== 6) {
      setError("Masukkan 6 digit kode OTP.");
      return;
    }
    setError(null);
    setBusy(true);
    setBusyLabel("Memverifikasi kode…");
    try {
      const { token, sender: verifiedSender } = await verifyAuthOtp(phone, code, name.trim() || undefined);
      setSession({ token, sender: verifiedSender });
      setLastPhone(phone);
      afterAuthSuccess(verifiedSender);
    } catch (err) {
      setError(messageFor(err, "Kode OTP tidak dapat diverifikasi."));
    } finally {
      setBusy(false);
    }
  }

  async function handleActivatePasskey() {
    if (!sender) return;
    setError(null);
    setBusy(true);
    setBusyLabel("Mengaktifkan sidik jari…");
    try {
      const { keyIdBase64, contractId } = await registerPasskeyAndWallet(sender.name);
      setWalletInfo({ keyId: keyIdBase64, walletAddress: contractId });
      redirectAfterLogin();
    } catch (err) {
      setError(messageFor(err, "Sidik jari belum dapat diaktifkan. Kamu bisa mencobanya lagi nanti di Akun."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell variant="bare">
      <div className="mx-auto flex min-h-[100dvh] max-w-md flex-col justify-center px-5 py-10">
        <Card>
          {step === "phone" && (
            <div className="grid gap-5">
              <div>
                <p className="text-xs font-extrabold tracking-[.15em] text-brand-deep">MASUK</p>
                <h1 className="mt-2 text-3xl font-extrabold tracking-[-.05em]">Masuk ke Sangu</h1>
                <p className="mt-2 text-sm text-muted">Pakai nomor HP-mu. Kalau perangkat ini sudah dikenali, cukup sidik jari saja.</p>
              </div>
              <Field label="Nomor HP" hint="Format internasional, mis. +60123456789 / +85212345678 / +62812…">
                <TextInput
                  inputMode="tel"
                  placeholder="+60 / +852 / +62…"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                />
              </Field>
              {error && <p className="text-sm font-semibold text-danger" role="alert">{error}</p>}
              <Button fullWidth onClick={handleContinue} disabled={busy}>{busy ? busyLabel : "Lanjutkan"}</Button>
              {showSmsFallback && (
                <Button fullWidth variant="secondary" onClick={sendOtp} disabled={busy}>Masuk dengan kode SMS</Button>
              )}
            </div>
          )}

          {step === "otp" && (
            <div className="grid gap-5">
              <div>
                <p className="text-xs font-extrabold tracking-[.15em] text-brand-deep">VERIFIKASI</p>
                <h1 className="mt-2 text-3xl font-extrabold tracking-[-.05em]">Masukkan kode OTP</h1>
                <p className="mt-2 text-sm text-muted">Kami mengirim kode 6 digit ke {phone}.</p>
              </div>
              <OtpInput value={code} onChange={setCode} />
              <Field label="Nama lengkap" hint="Isi kalau ini pertama kali kamu daftar.">
                <TextInput placeholder="Nama sesuai KTP/paspor" value={name} onChange={(event) => setName(event.target.value)} />
              </Field>
              {error && <p className="text-sm font-semibold text-danger" role="alert">{error}</p>}
              <Button fullWidth onClick={handleVerifyOtp} disabled={busy}>{busy ? busyLabel : "Verifikasi & masuk"}</Button>
              <Button fullWidth variant="ghost" onClick={sendOtp} disabled={busy || resendIn > 0}>
                {resendIn > 0 ? `Kirim ulang kode (${resendIn}d)` : "Kirim ulang kode"}
              </Button>
            </div>
          )}

          {step === "passkey-setup" && (
            <div className="grid gap-5">
              <div>
                <p className="text-xs font-extrabold tracking-[.15em] text-brand-deep">AMANKAN AKUN</p>
                <h1 className="mt-2 text-3xl font-extrabold tracking-[-.05em]">Aktifkan sidik jari untuk keamanan &amp; masuk cepat</h1>
                <p className="mt-2 text-sm text-muted">Sidik jari dipakai untuk masuk tanpa OTP dan mengonfirmasi setiap transfer.</p>
              </div>
              {error && <p className="text-sm font-semibold text-danger" role="alert">{error}</p>}
              <Button fullWidth onClick={handleActivatePasskey} disabled={busy}>{busy ? busyLabel : "Aktifkan sidik jari"}</Button>
              <Button fullWidth variant="ghost" onClick={redirectAfterLogin} disabled={busy}>Lewati dulu</Button>
            </div>
          )}
        </Card>
      </div>
    </AppShell>
  );
}

function OtpInput({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const digits = Array.from({ length: 6 }, (_, index) => value[index] ?? "");

  function commit(nextDigits: string[]) {
    onChange(nextDigits.join("").slice(0, 6));
  }

  function handleChange(index: number, event: ChangeEvent<HTMLInputElement>) {
    const raw = event.target.value.replace(/\D/g, "");
    const next = digits.slice();
    if (!raw) {
      next[index] = "";
      commit(next);
      return;
    }
    const chars = raw.split("");
    let cursor = index;
    for (const char of chars) {
      if (cursor > 5) break;
      next[cursor] = char;
      cursor += 1;
    }
    commit(next);
    refs.current[Math.min(cursor, 5)]?.focus();
  }

  function handleKeyDown(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Backspace" && !digits[index] && index > 0) refs.current[index - 1]?.focus();
  }

  function handlePaste(index: number, event: ClipboardEvent<HTMLInputElement>) {
    const text = event.clipboardData.getData("text").replace(/\D/g, "");
    if (!text) return;
    event.preventDefault();
    onChange(text.slice(0, 6));
    refs.current[Math.min(Math.max(text.length, 1), 6) - 1]?.focus();
  }

  return (
    <div className="flex gap-2" role="group" aria-label="Kode OTP 6 digit">
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(element) => { refs.current[index] = element; }}
          inputMode="numeric"
          maxLength={6}
          value={digit}
          onChange={(event) => handleChange(index, event)}
          onKeyDown={(event) => handleKeyDown(index, event)}
          onPaste={(event) => handlePaste(index, event)}
          aria-label={`Digit ${index + 1}`}
          className="size-12 rounded-2xl border border-line text-center text-xl font-extrabold focus:border-brand focus:outline-none"
        />
      ))}
    </div>
  );
}
