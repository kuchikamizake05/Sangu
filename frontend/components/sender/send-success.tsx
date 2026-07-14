"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircleIcon } from "@/components/ui/icons";
import { createRecurring, type Corridor } from "@/lib/api";
import { useT } from "@/lib/i18n/locale-context";
import styles from "./send-success.module.css";

export function SendSuccess({
  amountLabel,
  recipientPhone,
  claimUrl,
  onBackHome,
  corridor,
  amountForeign,
}: {
  amountLabel: string;
  recipientPhone: string;
  claimUrl: string;
  onBackHome: () => void;
  /** Bila corridor+amountForeign terisi, tawarkan "Jadikan kiriman bulanan". */
  corridor?: Corridor;
  amountForeign?: string;
}) {
  const t = useT();
  const [notice, setNotice] = useState<string | null>(null);
  const [showRecurring, setShowRecurring] = useState(false);
  const [dayOfMonth, setDayOfMonth] = useState("1");
  const [recurringBusy, setRecurringBusy] = useState(false);
  const [recurringDone, setRecurringDone] = useState(false);
  const [recurringNotice, setRecurringNotice] = useState<string | null>(null);
  const canOfferRecurring = Boolean(corridor && amountForeign && Number(amountForeign) > 0);

  async function saveRecurring() {
    if (!corridor || !amountForeign) return;
    const day = Number(dayOfMonth);
    if (!Number.isInteger(day) || day < 1 || day > 28) { setRecurringNotice(t("send.dayRangeError")); return; }
    setRecurringBusy(true); setRecurringNotice(null);
    try {
      await createRecurring({ recipientPhone, corridor, amountForeign, dayOfMonth: day });
      setRecurringDone(true);
      setShowRecurring(false);
    } catch { setRecurringNotice(t("send.scheduleSaveError")); }
    finally { setRecurringBusy(false); }
  }

  async function share() {
    const payload = { title: "Sangu", text: t("send.shareText"), url: claimUrl };
    try {
      if (navigator.share) await navigator.share(payload);
      else {
        await navigator.clipboard.writeText(claimUrl);
        setNotice(t("send.claimLinkCopied"));
      }
    } catch {
      setNotice(t("send.claimLinkNotShared"));
    }
  }

  return (
    <div className="flex min-h-[70dvh] flex-col items-center justify-center gap-6 px-6 text-center">
      <span className={`flex size-20 items-center justify-center rounded-full bg-success text-white ${styles.pop}`}>
        <CheckCircleIcon className="size-12" />
      </span>
      <div>
        <p className="text-xs font-extrabold tracking-[.15em] text-brand-deep">{t("send.sentEyebrow")}</p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-[-.05em]">{t("send.sentTitle")}</h1>
        <p className="mt-2 text-base text-muted">{amountLabel} → {recipientPhone}</p>
      </div>
      <div className="grid w-full max-w-xs justify-items-center gap-3">
        <Button className="w-56" onClick={share}>{t("send.shareLink")}</Button>
        {canOfferRecurring && !recurringDone && (
          <Button className="w-56" variant="secondary" onClick={() => { setShowRecurring((open) => !open); setRecurringNotice(null); }}>
            {showRecurring ? t("send.cancel") : t("send.makeRecurring")}
          </Button>
        )}
        <Button className="w-56" variant="ghost" onClick={onBackHome}>{t("send.backHome")}</Button>
      </div>
      {showRecurring && !recurringDone && (
        <div className="grid w-full max-w-xs gap-3 rounded-3xl border border-line bg-surface p-4 text-left">
          <p className="text-sm text-muted">{amountLabel} ke {recipientPhone}{t("send.recurringIntroSuffix")}</p>
          <label className="text-xs font-semibold text-muted" htmlFor="recurring-day">{t("send.monthlyDayLabel")}</label>
          <input
            id="recurring-day"
            inputMode="numeric"
            className="rounded-xl border border-line bg-canvas px-3 py-2 text-sm tabular-nums text-ink outline-none"
            value={dayOfMonth}
            onChange={(event) => setDayOfMonth(event.target.value)}
          />
          <Button onClick={saveRecurring} disabled={recurringBusy} fullWidth>{recurringBusy ? t("send.saving") : t("send.saveSchedule")}</Button>
          {recurringNotice && <p className="text-sm font-semibold text-danger" role="alert">{recurringNotice}</p>}
        </div>
      )}
      {recurringDone && <p className="text-sm font-semibold text-success" role="status">{t("send.recurringCreated")}</p>}
      {notice && <p className="text-sm text-muted" role="status">{notice}</p>}
    </div>
  );
}
