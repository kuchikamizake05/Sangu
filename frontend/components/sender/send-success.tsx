"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircleIcon } from "@/components/ui/icons";
import { createRecurring, type Corridor } from "@/lib/api";
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
    if (!Number.isInteger(day) || day < 1 || day > 28) { setRecurringNotice("Tanggal harus antara 1 sampai 28."); return; }
    setRecurringBusy(true); setRecurringNotice(null);
    try {
      await createRecurring({ recipientPhone, corridor, amountForeign, dayOfMonth: day });
      setRecurringDone(true);
      setShowRecurring(false);
    } catch { setRecurringNotice("Jadwal belum dapat disimpan. Coba lagi."); }
    finally { setRecurringBusy(false); }
  }

  async function share() {
    const payload = { title: "Sangu", text: "Aku mengirim uang untukmu. Buka link ini untuk mencairkan.", url: claimUrl };
    try {
      if (navigator.share) await navigator.share(payload);
      else {
        await navigator.clipboard.writeText(claimUrl);
        setNotice("Link claim sudah disalin.");
      }
    } catch {
      setNotice("Link claim belum dibagikan. Kamu bisa menyalinnya di bawah.");
    }
  }

  return (
    <div className="flex min-h-[70dvh] flex-col items-center justify-center gap-6 px-6 text-center">
      <span className={`flex size-20 items-center justify-center rounded-full bg-success text-white ${styles.pop}`}>
        <CheckCircleIcon className="size-12" />
      </span>
      <div>
        <p className="text-xs font-extrabold tracking-[.15em] text-brand-deep">TERKIRIM</p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-[-.05em]">Terkirim!</h1>
        <p className="mt-2 text-base text-muted">{amountLabel} → {recipientPhone}</p>
      </div>
      <div className="grid w-full max-w-xs justify-items-center gap-3">
        <Button className="w-56" onClick={share}>Bagikan link</Button>
        {canOfferRecurring && !recurringDone && (
          <Button className="w-56" variant="secondary" onClick={() => { setShowRecurring((open) => !open); setRecurringNotice(null); }}>
            {showRecurring ? "Batal" : "Jadikan kiriman bulanan"}
          </Button>
        )}
        <Button className="w-56" variant="ghost" onClick={onBackHome}>Kembali ke Beranda</Button>
      </div>
      {showRecurring && !recurringDone && (
        <div className="grid w-full max-w-xs gap-3 rounded-3xl border border-line bg-surface p-4 text-left">
          <p className="text-sm text-muted">{amountLabel} ke {recipientPhone}, dikirim tiap bulan. Kamu tetap konfirmasi dengan sidik jari di tiap kiriman.</p>
          <label className="text-xs font-semibold text-muted" htmlFor="recurring-day">Tanggal tiap bulan (1–28)</label>
          <input
            id="recurring-day"
            inputMode="numeric"
            className="rounded-xl border border-line bg-canvas px-3 py-2 text-sm tabular-nums text-ink outline-none"
            value={dayOfMonth}
            onChange={(event) => setDayOfMonth(event.target.value)}
          />
          <Button onClick={saveRecurring} disabled={recurringBusy} fullWidth>{recurringBusy ? "Menyimpan…" : "Simpan jadwal"}</Button>
          {recurringNotice && <p className="text-sm font-semibold text-danger" role="alert">{recurringNotice}</p>}
        </div>
      )}
      {recurringDone && <p className="text-sm font-semibold text-success" role="status">Jadwal bulanan dibuat. Atur kapan saja di menu Bulanan.</p>}
      {notice && <p className="text-sm text-muted" role="status">{notice}</p>}
    </div>
  );
}
