"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { AuthGuard } from "@/components/auth-guard";
import { AmountScreen } from "@/components/sender/amount-screen";
import { RecipientStep } from "@/components/sender/recipient-step";
import { SendSuccess } from "@/components/sender/send-success";
import { TransactionConfirmation } from "@/components/sender/transaction-confirmation";
import { markRecurringSent, prepareSend, type Corridor, type PayoutMethod, type PrepareSendResponse } from "@/lib/api";
import { formatForeignAmount, isE164Phone, appendDigit } from "@/lib/send-flow";
import { useQuote } from "@/lib/use-quote";
import type { NumpadKey } from "@/components/sender/numpad";

type Step = "recipient" | "amount" | "confirm" | "success";

const stepIndex: Record<Step, number> = { recipient: 1, amount: 2, confirm: 3, success: 3 };

export default function SendPage() {
  const [step, setStep] = useState<Step>("recipient");
  const [corridor, setCorridor] = useState<Corridor>("MY");
  const [phone, setPhone] = useState("");
  const [methodHint, setMethodHint] = useState<PayoutMethod | null>(null);
  const [amount, setAmount] = useState("");
  const [recurringId, setRecurringId] = useState<string | null>(null);

  const [prepared, setPrepared] = useState<PrepareSendResponse | null>(null);
  const [prepareBusy, setPrepareBusy] = useState(false);
  const [prepareError, setPrepareError] = useState<string | null>(null);
  const [claimUrl, setClaimUrl] = useState<string | null>(null);

  const { quote, loading: quoteLoading, error: quoteError } = useQuote(corridor, amount);

  // Prefill dari Beranda: ?recipient=&corridor=&amount=&recurringId= — lengkap (recipient+corridor+amount) boleh lompat ke jumlah.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const qRecipient = params.get("recipient");
    const qCorridor = params.get("corridor");
    const qAmount = params.get("amount");
    const qRecurringId = params.get("recurringId");

    if (qRecipient) setPhone(qRecipient);
    if (qCorridor === "MY" || qCorridor === "HK") setCorridor(qCorridor);
    if (qAmount) setAmount(qAmount);
    if (qRecurringId) setRecurringId(qRecurringId);

    const corridorValid = qCorridor === "MY" || qCorridor === "HK";
    if (qRecipient && isE164Phone(qRecipient) && corridorValid && qAmount && Number(qAmount) > 0) {
      setStep("amount");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function runPrepare() {
    setPrepareBusy(true);
    setPrepareError(null);
    try {
      const response = await prepareSend({ corridor, amountForeign: amount, recipientPhone: phone, methodHint: methodHint ?? undefined });
      setPrepared(response);
    } catch (error) {
      setPrepareError(error instanceof Error ? error.message : "Transfer belum dapat disiapkan. Coba beberapa saat lagi.");
    } finally {
      setPrepareBusy(false);
    }
  }

  useEffect(() => {
    if (step === "confirm" && !prepared) runPrepare();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  function goBack() {
    if (step === "recipient") {
      window.location.assign("/app");
      return;
    }
    if (step === "amount") setStep("recipient");
    else if (step === "confirm") { setStep("amount"); setPrepared(null); setPrepareError(null); }
  }

  function handleConfirmed(url: string) {
    setClaimUrl(url);
    setStep("success");
    if (recurringId) markRecurringSent(recurringId).catch(() => undefined);
  }

  function handleAmountKey(key: NumpadKey) {
    setAmount((current) => appendDigit(current, key));
  }

  return (
    <AuthGuard>
      <AppShell mode="sender" variant="bare">
        <div className="mx-auto flex min-h-[calc(100dvh-32px)] max-w-md flex-col">
          {step !== "success" && <Header step={step} onBack={goBack} />}

          {step === "recipient" && (
            <RecipientStep
              corridor={corridor}
              phone={phone}
              methodHint={methodHint}
              onCorridorChange={setCorridor}
              onPhoneChange={setPhone}
              onMethodChange={setMethodHint}
              onContinue={() => setStep("amount")}
            />
          )}

          {step === "amount" && (
            <AmountScreen
              corridor={corridor}
              amount={amount}
              quote={quote}
              loading={quoteLoading}
              error={quoteError}
              onKey={handleAmountKey}
              onContinue={() => setStep("confirm")}
              canContinue={Boolean(quote) && !quoteLoading && Number(amount) > 0}
            />
          )}

          {step === "confirm" && (
            <ConfirmStep
              corridor={corridor}
              amount={amount}
              phone={phone}
              prepared={prepared}
              prepareBusy={prepareBusy}
              prepareError={prepareError}
              onRetry={runPrepare}
              onDone={handleConfirmed}
            />
          )}

          {step === "success" && claimUrl && (
            <SendSuccess
              amountLabel={formatForeignAmount(amount, corridor)}
              recipientPhone={phone}
              claimUrl={claimUrl}
              onBackHome={() => window.location.assign("/app")}
            />
          )}
        </div>
      </AppShell>
    </AuthGuard>
  );
}

function Header({ step, onBack }: { step: Step; onBack: () => void }) {
  const current = stepIndex[step];
  return (
    <div className="flex items-center justify-between px-1 pb-2 pt-1">
      <button type="button" aria-label="Kembali" onClick={onBack} className="flex size-9 items-center justify-center rounded-full text-xl text-ink transition hover:bg-canvas">
        ✕
      </button>
      <div className="flex gap-1.5" role="progressbar" aria-label="Progres kirim uang" aria-valuemin={1} aria-valuemax={3} aria-valuenow={current}>
        {[1, 2, 3].map((item) => <span key={item} className={`h-1.5 w-5 rounded-full ${item <= current ? "bg-brand" : "bg-line"}`} />)}
      </div>
      <span className="size-9" aria-hidden="true" />
    </div>
  );
}

function ConfirmStep({
  corridor,
  amount,
  phone,
  prepared,
  prepareBusy,
  prepareError,
  onRetry,
  onDone,
}: {
  corridor: Corridor;
  amount: string;
  phone: string;
  prepared: PrepareSendResponse | null;
  prepareBusy: boolean;
  prepareError: string | null;
  onRetry: () => void;
  onDone: (claimUrl: string) => void;
}) {
  return (
    <div className="flex flex-1 flex-col justify-end">
      <div className="rounded-t-[30px] bg-surface p-6 shadow-[0_-8px_30px_rgba(0,0,0,0.06)]">
        <h2 className="text-xl font-extrabold tracking-[-.04em]">Periksa kirimanmu</h2>

        <div className="mt-4 grid gap-2 text-sm">
          <p className="flex justify-between"><span className="text-muted">Penerima</span><span className="font-bold">{phone}</span></p>
          <p className="flex justify-between"><span className="text-muted">Kamu kirim</span><span className="font-bold tabular-nums">{formatForeignAmount(amount, corridor)}</span></p>
          <p className="flex justify-between"><span className="text-muted">Keluarga terima</span><span className="font-bold tabular-nums">± Rp {Number(prepared?.quote.amountIdr ?? 0).toLocaleString("id-ID")}</span></p>
          <p className="flex justify-between"><span className="text-muted">Biaya</span><span className="font-bold tabular-nums">Rp {Number(prepared?.quote.feeIdrEstimate ?? 0).toLocaleString("id-ID")}</span></p>
        </div>
        {prepared && <p className="mt-2 text-xs text-muted">Kurs berlaku · {new Date(prepared.quote.rateAsOf).toLocaleString("id-ID")}</p>}

        {prepareBusy && <p className="mt-6 text-sm text-muted">Menyiapkan transfer…</p>}
        {prepareError && (
          <div className="mt-6 flex items-center justify-between gap-3 rounded-2xl bg-danger-wash p-3 text-sm font-semibold text-danger" role="alert">
            <span>{prepareError}</span>
            <button type="button" className="shrink-0 font-extrabold underline" onClick={onRetry}>Coba lagi</button>
          </div>
        )}
        {prepared && !prepareError && (
          <div className="mt-6">
            <TransactionConfirmation transferId={prepared.transferId} unsignedXDR={prepared.unsignedXDR} onDone={onDone} />
          </div>
        )}
      </div>
    </div>
  );
}
