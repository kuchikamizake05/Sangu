"use client";

import { useEffect, useRef, useState, type ChangeEvent, type ClipboardEvent, type KeyboardEvent } from "react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, TextInput } from "@/components/ui/field";
import { ApiError, getPasskeyLoginOptions, requestAuthOtp, verifyAuthOtp, type SenderProfile } from "@/lib/api";
import { getLastPhone, setLastPhone, setSession, setWalletInfo } from "@/lib/auth-session";
import { formatLocalPhone, getPhoneCountry, normalizePhoneEntry, parsePhoneEntry, PHONE_COUNTRIES, type PhoneCountry } from "@/lib/phone-number";
import { isE164Phone } from "@/lib/send-flow";
import { loginWithPasskey, registerPasskeyAndWallet } from "@/lib/passkey-wallet";
import { useT } from "@/lib/i18n/locale-context";

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
  const t = useT();
  const [step, setStep] = useState<Step>("phone");
  const [country, setCountry] = useState<PhoneCountry>(getPhoneCountry("ID"));
  const [countryOpen, setCountryOpen] = useState(false);
  const [phone, setPhone] = useState("");
  const [e164Phone, setE164Phone] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [sender, setSender] = useState<SenderProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [busyLabel, setBusyLabel] = useState(t("login.processing"));
  const [showSmsFallback, setShowSmsFallback] = useState(false);
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    const stored = getLastPhone();
    if (stored) {
      const parsed = parsePhoneEntry(stored);
      setCountry(parsed.country);
      setPhone(parsed.localNumber);
    }
  }, []);

  useEffect(() => {
    if (step !== "otp" || resendIn <= 0) return;
    const timer = window.setInterval(() => setResendIn((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [step, resendIn]);

  async function sendOtp(phoneNumber: string) {
    try {
      await requestAuthOtp(phoneNumber);
      setLastPhone(phoneNumber);
      setStep("otp");
      setResendIn(RESEND_SECONDS);
      setError(null);
    } catch (err) {
      setError(messageFor(err, t("login.otpSendError")));
    }
  }

  async function handleContinue() {
    const phoneNumber = normalizePhoneEntry(country, phone);
    if (!isE164Phone(phoneNumber)) {
      setError(t("login.phoneFormatError"));
      return;
    }
    setE164Phone(phoneNumber);
    setError(null);
    setShowSmsFallback(false);
    setBusy(true);
    setBusyLabel(t("login.checkingAccount"));
    try {
      await getPasskeyLoginOptions(phoneNumber);
      setBusyLabel(t("login.signingInPasskey"));
      const { token, sender: loggedInSender } = await loginWithPasskey(phoneNumber);
      setSession({ token, sender: loggedInSender });
      setLastPhone(phoneNumber);
      afterAuthSuccess(loggedInSender);
    } catch (err) {
      if (err instanceof ApiError && err.code === "SENDER_NOT_FOUND") {
        await sendOtp(phoneNumber);
      } else {
        setError(messageFor(err, t("login.passkeyLoginError")));
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
      setError(t("login.otpLengthError"));
      return;
    }
    setError(null);
    setBusy(true);
    setBusyLabel(t("login.verifyingCode"));
    try {
      const phoneNumber = e164Phone || normalizePhoneEntry(country, phone);
      const { token, sender: verifiedSender } = await verifyAuthOtp(phoneNumber, code, name.trim() || undefined);
      setSession({ token, sender: verifiedSender });
      setLastPhone(phoneNumber);
      afterAuthSuccess(verifiedSender);
    } catch (err) {
      setError(messageFor(err, t("login.otpVerifyError")));
    } finally {
      setBusy(false);
    }
  }

  async function handleActivatePasskey() {
    if (!sender) return;
    setError(null);
    setBusy(true);
    setBusyLabel(t("login.activatingPasskey"));
    try {
      const { keyIdBase64, contractId } = await registerPasskeyAndWallet(sender.name);
      setWalletInfo({ keyId: keyIdBase64, walletAddress: contractId });
      redirectAfterLogin();
    } catch (err) {
      setError(messageFor(err, t("login.passkeyActivateError")));
    } finally {
      setBusy(false);
    }
  }

  function handlePhoneChange(value: string) {
    if (value.trim().startsWith("+")) {
      const parsed = parsePhoneEntry(value);
      setCountry(parsed.country);
      setPhone(parsed.localNumber);
      return;
    }
    setPhone(value.replace(/\D/g, ""));
  }

  const normalizedPhone = normalizePhoneEntry(country, phone);
  const phoneIsValid = isE164Phone(normalizedPhone);

  return (
    <AppShell variant="bare">
      <div className="mx-auto flex min-h-[100dvh] max-w-md flex-col justify-center px-5 py-10">
        <Card>
          {step === "phone" && (
            <div className="grid grid-cols-1 gap-5">
              <div>
                <p className="text-xs font-extrabold tracking-[.15em] text-brand-deep">{t("login.eyebrowSignIn")}</p>
                <h1 className="mt-2 text-3xl font-extrabold tracking-[-.05em]">{t("login.title")}</h1>
                <p className="mt-2 text-sm text-muted">{t("login.subtitle")}</p>
              </div>
              <Field label={t("login.phoneLabel")}>
                <div className={`relative flex items-center gap-2 rounded-xl border bg-white px-2 transition ${phone.length > 0 && phoneIsValid ? "border-success" : "border-line"}`}>
                  <button
                    type="button"
                    aria-label={t("login.countryCodeAria")}
                    aria-haspopup="listbox"
                    aria-expanded={countryOpen}
                    onClick={() => setCountryOpen((open) => !open)}
                    className="flex h-12 shrink-0 items-center gap-1.5 rounded-lg px-1 text-sm font-bold text-ink outline-none focus-visible:ring-2 focus-visible:ring-brand"
                  >
                    {country.flagCode ? <span aria-hidden="true" className={`fi fi-${country.flagCode} fis rounded-[1px] text-xl leading-none`} /> : <span aria-hidden="true">{t("login.otherCountry")}</span>}
                    <span>{country.dialCode || ""}</span>
                    <svg aria-hidden="true" viewBox="0 0 16 16" className="size-4 text-muted" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m3.5 6 4.5 4.5L12.5 6" />
                    </svg>
                  </button>
                  {countryOpen && (
                    <div role="listbox" aria-label={t("login.selectCountryAria")} className="absolute left-0 top-[calc(100%+0.5rem)] z-20 grid w-64 max-h-72 gap-0.5 overflow-y-auto rounded-xl border border-line bg-white p-1.5 shadow-lg">
                      {PHONE_COUNTRIES.map((item) => (
                        <button
                          key={item.iso}
                          type="button"
                          role="option"
                          aria-selected={item.iso === country.iso}
                          aria-label={`${item.label} ${item.dialCode || ""}`.trim()}
                          onClick={() => { setCountry(item); setCountryOpen(false); }}
                          className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition hover:bg-surface ${item.iso === country.iso ? "bg-surface font-bold" : ""}`}
                        >
                          {item.flagCode ? <span aria-hidden="true" className={`fi fi-${item.flagCode} fis rounded-[1px] text-xl leading-none`} /> : <span aria-hidden="true" className="w-5 text-center">•</span>}
                          <span className="flex-1">{item.label}</span>
                          <span className="font-bold text-muted">{item.dialCode || t("login.otherCountry")}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  <TextInput
                    aria-label={t("login.phoneLabel")}
                    inputMode="tel"
                    placeholder={country.iso === "OTHER" ? t("login.phonePlaceholderOther") : t("login.phonePlaceholderDefault")}
                    value={formatLocalPhone(phone)}
                    onChange={(event) => handlePhoneChange(event.target.value)}
                    className="min-w-0 border-0 bg-transparent px-0 focus:outline-none"
                  />
                  {phone.length > 0 && phoneIsValid && <span aria-label={t("login.phoneValidAria")} className="shrink-0 text-xl font-extrabold text-success">✓</span>}
                </div>
              </Field>
              {error && <p className="text-sm font-semibold text-danger" role="alert">{error}</p>}
              <Button fullWidth onClick={handleContinue} disabled={busy}>{busy ? busyLabel : t("login.continueButton")}</Button>
              {showSmsFallback && (
                <Button fullWidth variant="secondary" onClick={() => sendOtp(e164Phone || normalizePhoneEntry(country, phone))} disabled={busy}>{t("login.smsFallbackButton")}</Button>
              )}
            </div>
          )}

          {step === "otp" && (
            <div className="grid grid-cols-1 gap-5">
              <div>
                <p className="text-xs font-extrabold tracking-[.15em] text-brand-deep">{t("login.eyebrowVerify")}</p>
                <h1 className="mt-2 whitespace-nowrap text-[clamp(1.375rem,6.5vw,1.875rem)] font-extrabold tracking-[-.05em]">{t("login.otpTitle")}</h1>
                <p className="mt-2 text-sm text-muted">{t("login.otpSentPrefix")} {e164Phone}.</p>
              </div>
              <OtpInput value={code} onChange={setCode} />
              <Field label={t("login.nameLabel")} hint={t("login.nameHint")}>
                <TextInput placeholder={t("login.namePlaceholder")} value={name} onChange={(event) => setName(event.target.value)} />
              </Field>
              {error && <p className="text-sm font-semibold text-danger" role="alert">{error}</p>}
              <Button fullWidth onClick={handleVerifyOtp} disabled={busy}>{busy ? busyLabel : t("login.verifyButton")}</Button>
              <Button fullWidth variant="ghost" className="whitespace-nowrap" onClick={() => sendOtp(e164Phone || normalizePhoneEntry(country, phone))} disabled={busy || resendIn > 0}>
                {resendIn > 0 ? `${t("login.resendCountdownPrefix")} ${resendIn} ${t("login.secondsUnit")}` : t("login.resendCode")}
              </Button>
            </div>
          )}

          {step === "passkey-setup" && (
            <div className="grid grid-cols-1 gap-5">
              <div>
                <p className="text-xs font-extrabold tracking-[.15em] text-brand-deep">{t("login.eyebrowSecure")}</p>
                <h1 className="mt-2 text-3xl font-extrabold tracking-[-.05em]">{t("login.passkeySetupTitle")}</h1>
                <p className="mt-2 text-sm text-muted">{t("login.passkeySetupSubtitle")}</p>
              </div>
              {error && <p className="text-sm font-semibold text-danger" role="alert">{error}</p>}
              <Button fullWidth onClick={handleActivatePasskey} disabled={busy}>{busy ? busyLabel : t("login.activatePasskeyButton")}</Button>
              <Button fullWidth variant="ghost" onClick={redirectAfterLogin} disabled={busy}>{t("login.skipButton")}</Button>
            </div>
          )}
        </Card>
      </div>
    </AppShell>
  );
}

function OtpInput({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const t = useT();
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
    <div className="flex gap-2" role="group" aria-label={t("login.otpGroupAria")}>
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(element) => { refs.current[index] = element; }}
          inputMode="numeric"
          maxLength={6}
          placeholder={t("login.otpDigitPlaceholder")}
          value={digit}
          onChange={(event) => handleChange(index, event)}
          onKeyDown={(event) => handleKeyDown(index, event)}
          onPaste={(event) => handlePaste(index, event)}
          aria-label={`${t("login.otpDigitAria")} ${index + 1}`}
          className="h-12 min-w-0 flex-1 max-w-12 rounded-2xl border border-line text-center text-xl font-extrabold focus:border-brand focus:outline-none"
        />
      ))}
    </div>
  );
}
