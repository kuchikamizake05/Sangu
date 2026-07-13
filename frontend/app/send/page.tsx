"use client";

import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { TransactionConfirmation } from "@/components/sender/transaction-confirmation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, SelectInput, TextInput } from "@/components/ui/field";
import { getQuote, prepareSend, type Corridor, type PayoutMethod, type PrepareSendResponse, type Quote } from "@/lib/api";
import { canAdvance, formatForeignAmount, type SenderStep } from "@/lib/send-flow";

const payoutChoices: Array<{ value: PayoutMethod; label: string; hint: string }> = [
  { value: "dana", label: "DANA", hint: "Praktis untuk keluarga" },
  { value: "gopay", label: "GoPay", hint: "Pencairan ke nomor ponsel" },
  { value: "bank", label: "Bank", hint: "Untuk rekening keluarga" },
  { value: "cash", label: "Tunai di gerai", hint: "Tidak perlu rekening" },
];

export default function SendPage() {
  const [step, setStep] = useState<SenderStep>(1);
  const [corridor, setCorridor] = useState<Corridor>("MY");
  const [amount, setAmount] = useState("500");
  const [phone, setPhone] = useState("+628120000000");
  const [methodHint, setMethodHint] = useState<PayoutMethod>("cash");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [prepared, setPrepared] = useState<PrepareSendResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function loadQuote() {
    setError(null);
    setBusy(true);
    try {
      setQuote(await getQuote(corridor, amount));
    } catch {
      setError("Kurs belum dapat dimuat. Periksa koneksi lalu coba lagi.");
    } finally {
      setBusy(false);
    }
  }

  function next() {
    if (!canAdvance({ step, amount, phone, hasQuote: Boolean(quote) })) {
      setError(step === 1 ? "Masukkan nomor WhatsApp dengan format internasional, mis. +62812…" : "Muat kurs terlebih dahulu sebelum melanjutkan.");
      return;
    }
    setError(null);
    setStep((current) => Math.min(4, current + 1) as SenderStep);
  }

  async function prepareTransfer() {
    setError(null);
    setBusy(true);
    try {
      setPrepared(await prepareSend({ corridor, amountForeign: amount, recipientPhone: phone, methodHint }));
    } catch {
      setError("Transfer belum dapat disiapkan. Coba beberapa saat lagi.");
    } finally {
      setBusy(false);
    }
  }

  if (prepared) {
    return <AppShell><div className="mx-auto max-w-2xl pb-12"><PreparedTransfer prepared={prepared} onCancel={() => setPrepared(null)} /></div></AppShell>;
  }

  return <AppShell><div className="mx-auto grid max-w-5xl gap-6 pb-12 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
    <Card>
      <StepHeader step={step} />
      {step === 1 && <RecipientStep phone={phone} onPhoneChange={setPhone} />}
      {step === 2 && <AmountStep amount={amount} corridor={corridor} quote={quote} busy={busy} onAmountChange={(value) => { setAmount(value); setQuote(null); }} onCorridorChange={(value) => { setCorridor(value); setQuote(null); }} onLoadQuote={loadQuote} />}
      {step === 3 && <PayoutStep methodHint={methodHint} onMethodChange={setMethodHint} />}
      {step === 4 && <ReviewStep amount={amount} corridor={corridor} methodHint={methodHint} phone={phone} quote={quote} />}
      {error && <p className="mt-5 text-sm font-semibold text-[#c72307]" role="alert">{error}</p>}
      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        {step > 1 && <Button variant="secondary" fullWidth onClick={() => setStep((current) => (current - 1) as SenderStep)}>Kembali</Button>}
        {step < 4 ? <Button fullWidth onClick={next} disabled={busy}>Lanjutkan</Button> : <Button fullWidth onClick={prepareTransfer} disabled={busy}>{busy ? "Menyiapkan…" : "Siapkan transfer"}</Button>}
      </div>
    </Card>
    {quote && step >= 2 && <aside aria-label="Ringkasan transfer" className="hidden lg:sticky lg:top-8 lg:block"><QuoteCard quote={quote} /></aside>}
  </div></AppShell>;
}

function StepHeader({ step }: { step: SenderStep }) {
  return <div className="mb-7 flex items-center justify-between"><div><p className="text-xs font-extrabold tracking-[.15em] text-[#9e1d0e]">TRANSFER BARU</p><h1 className="mt-1 text-2xl font-extrabold tracking-[-.05em]">Langkah {step} dari 4</h1></div><div className="flex gap-1.5" role="progressbar" aria-label="Progress transfer" aria-valuemin={1} aria-valuemax={4} aria-valuenow={step} aria-valuetext={`Langkah ${step} dari 4`}>{[1, 2, 3, 4].map((item) => <span className={`h-2 w-6 rounded-full ${item <= step ? "bg-[#ff5113]" : "bg-[#ededed]"}`} key={item} />)}</div></div>;
}

function RecipientStep({ phone, onPhoneChange }: { phone: string; onPhoneChange: (value: string) => void }) {
  return <div className="grid gap-5"><div><h2 className="text-xl font-extrabold tracking-[-.04em]">Siapa yang akan menerima?</h2><p className="mt-1 text-sm text-[#676767]">Kami kirim link aman ke WhatsApp keluarga.</p></div><Field label="Nomor WhatsApp penerima" hint="Format internasional, mis. +62812…"><TextInput inputMode="tel" value={phone} onChange={(event) => onPhoneChange(event.target.value)} /></Field></div>;
}

function AmountStep({ amount, corridor, quote, busy, onAmountChange, onCorridorChange, onLoadQuote }: { amount: string; corridor: Corridor; quote: Quote | null; busy: boolean; onAmountChange: (value: string) => void; onCorridorChange: (value: Corridor) => void; onLoadQuote: () => void }) {
  return <div className="grid gap-5"><div><h2 className="text-xl font-extrabold tracking-[-.04em]">Tentukan jumlah kiriman</h2><p className="mt-1 text-sm text-[#676767]">Lihat estimasi yang diterima sebelum lanjut.</p></div><Field label="Koridor"><SelectInput value={corridor} onChange={(event) => onCorridorChange(event.target.value as Corridor)}><option value="MY">Malaysia → Indonesia</option><option value="HK">Hong Kong → Indonesia</option></SelectInput></Field><Field label="Jumlah kirim"><TextInput inputMode="decimal" value={amount} onChange={(event) => onAmountChange(event.target.value)} /></Field><Button variant="secondary" fullWidth onClick={onLoadQuote} disabled={busy}>{busy ? "Memuat kurs…" : "Lihat estimasi"}</Button>{quote && <div className="lg:hidden"><QuoteCard quote={quote} /></div>}</div>;
}

function PayoutStep({ methodHint, onMethodChange }: { methodHint: PayoutMethod; onMethodChange: (method: PayoutMethod) => void }) {
  return <div><h2 className="text-xl font-extrabold tracking-[-.04em]">Cara cair yang disarankan</h2><p className="mt-1 text-sm text-[#676767]">Penerima tetap dapat memilih metode lain dari link claim.</p><div className="mt-5 grid gap-3">{payoutChoices.map((choice) => <button className={`rounded-2xl border p-4 text-left transition ${methodHint === choice.value ? "border-[#ff5113] bg-[#ffe7d4]" : "border-[#ededed] hover:border-[#080808]"}`} key={choice.value} onClick={() => onMethodChange(choice.value)}><strong className="block">{choice.label}</strong><span className="text-sm text-[#676767]">{choice.hint}</span></button>)}</div></div>;
}

function ReviewStep({ amount, corridor, methodHint, phone, quote }: { amount: string; corridor: Corridor; methodHint: PayoutMethod; phone: string; quote: Quote | null }) {
  return <div className="grid gap-5"><div><h2 className="text-xl font-extrabold tracking-[-.04em]">Periksa kirimanmu</h2><p className="mt-1 text-sm text-[#676767]">Belum ada uang yang dikirim pada langkah ini.</p></div><div className="rounded-3xl bg-[#080808] p-5 text-white"><p className="text-sm text-white/60">Penerima menerima sekitar</p><strong className="mt-1 block text-4xl tracking-[-.06em]">Rp {Number(quote?.amountIdr).toLocaleString("id-ID")}</strong><div className="mt-5 border-t border-white/15 pt-4 text-sm"><p className="flex justify-between"><span>{phone}</span><span>{methodHint}</span></p><p className="mt-2 flex justify-between text-white/60"><span>Kamu kirim</span><span>{formatForeignAmount(amount, corridor)}</span></p></div></div></div>;
}

function PreparedTransfer({ prepared, onCancel }: { prepared: PrepareSendResponse; onCancel: () => void }) {
  return <Card className="border-[#57ce43] !bg-[#eaf8e8]"><span className="inline-flex size-10 items-center justify-center rounded-full bg-white font-extrabold text-[#278f35]">✓</span><h1 className="mt-5 text-3xl font-extrabold tracking-[-.05em]">Transfer siap dikonfirmasi</h1><p className="mt-2 max-w-md text-[#356f3b]">Data transfer sudah disiapkan. Konfirmasi dengan biometrik untuk menandatangani transaksi dari perangkatmu.</p><div className="mt-6 rounded-2xl bg-white p-4 text-sm"><span className="block text-[#676767]">ID transfer</span><strong className="block break-all">{prepared.transferId}</strong><span className="mt-3 block text-[#676767]">Berlaku sampai</span><strong>{new Date(prepared.expiry * 1000).toLocaleString("id-ID")}</strong></div><TransactionConfirmation transferId={prepared.transferId} unsignedXDR={prepared.unsignedXDR} /><Button className="mt-3" variant="ghost" fullWidth onClick={onCancel}>Batalkan dan ubah transfer</Button></Card>;
}

function QuoteCard({ quote }: { quote: Quote }) {
  return <div className="rounded-3xl bg-[#ffe7d4] p-5"><span className="text-xs font-extrabold tracking-[.13em] text-[#9e1d0e]">ESTIMASI PENERIMA</span><strong className="mt-2 block text-3xl tracking-[-.05em]">Rp {Number(quote.amountIdr).toLocaleString("id-ID")}</strong><div className="mt-4 grid gap-2 border-t border-[#9e1d0e]/15 pt-3 text-sm"><p className="flex justify-between"><span>Biaya Sangu</span><span>Rp {quote.feeIdrEstimate}</span></p><p className="flex justify-between"><span>Pembanding WU</span><span>Rp {Number(quote.comparison.westernUnionFeeIdrEstimate).toLocaleString("id-ID")}</span></p><p className="text-xs text-[#676767]">Rate referensi · {new Date(quote.rateAsOf).toLocaleString("id-ID")}</p></div></div>;
}
