"use client";

import { useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { AuthGuard } from "@/components/auth-guard";
import { TransferList } from "@/components/sender/transfer-list";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  getRecurring,
  getTransfers,
  getWalletBalance,
  markRecurringSent,
  topupWallet,
  type BalanceCurrency,
  type RecurringSchedule,
  type TransferSummary,
  type WalletBalance,
} from "@/lib/api";
import { useSession } from "@/lib/auth-session";
import { ChevronDownIcon, EyeIcon, EyeOffIcon } from "@/components/ui/icons";

const CURRENCY_PREFIX: Record<WalletBalance["currency"], string> = { USD: "$", MYR: "RM", HKD: "HK$" };
const CURRENCIES: Array<{ code: BalanceCurrency; label: string }> = [
  { code: "USD", label: "Dolar AS" },
  { code: "MYR", label: "Ringgit Malaysia" },
  { code: "HKD", label: "Dolar Hong Kong" },
];

function CurrencyDropdown({ currency, onChange }: { currency: BalanceCurrency; onChange: (next: BalanceCurrency) => void }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => { if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false); };
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => { document.removeEventListener("pointerdown", onPointerDown); document.removeEventListener("keydown", onKeyDown); };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label="Mata uang tampilan saldo"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 rounded-[14px] px-2 py-1.5 text-sm font-extrabold text-white/80 transition hover:bg-white/10 hover:text-white"
      >
        {currency}
        <ChevronDownIcon className={`size-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-20 mt-2 w-52 rounded-2xl bg-surface p-2 text-ink shadow-xl" role="listbox" aria-label="Pilih mata uang">
          {CURRENCIES.map((item) => (
            <button
              key={item.code}
              type="button"
              role="option"
              aria-selected={item.code === currency}
              onClick={() => { onChange(item.code); setOpen(false); }}
              className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition hover:bg-canvas ${item.code === currency ? "bg-canvas" : ""}`}
            >
              <span><strong className="block">{item.code}</strong><span className="text-xs text-muted">{item.label}</span></span>
              {item.code === currency && <span aria-hidden className="font-extrabold text-success">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function formatAmount(amount: string): string {
  const value = Number(amount);
  if (Number.isNaN(value)) return amount;
  return new Intl.NumberFormat("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
}

function formatIdr(amount: string): string {
  const value = Number(amount);
  if (Number.isNaN(value)) return amount;
  return new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(value);
}

function todayLabel(): string {
  return new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long" });
}

export default function SenderPage() {
  const { sender } = useSession();
  const [balance, setBalance] = useState<WalletBalance | null>(null);
  const [balanceError, setBalanceError] = useState<string | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(true);

  const [transfers, setTransfers] = useState<TransferSummary[] | null>(null);
  const [recurring, setRecurring] = useState<RecurringSchedule[]>([]);
  const [dismissedRecurringIds, setDismissedRecurringIds] = useState<string[]>([]);

  const [showTopup, setShowTopup] = useState(false);
  const [hideBalance, setHideBalance] = useState(false);
  const [currency, setCurrency] = useState<BalanceCurrency>("USD");
  const [topupAmount, setTopupAmount] = useState("100");
  const [topupBusy, setTopupBusy] = useState(false);
  const [topupNotice, setTopupNotice] = useState<string | null>(null);

  function loadBalance(nextCurrency: BalanceCurrency = currency) {
    setBalanceLoading(true);
    setBalanceError(null);
    getWalletBalance(nextCurrency)
      .then((data) => setBalance(data))
      .catch((error) => setBalanceError(error instanceof Error ? error.message : "Saldo belum dapat dimuat."))
      .finally(() => setBalanceLoading(false));
  }

  useEffect(() => {
    loadBalance();
    getTransfers().then(setTransfers).catch(() => setTransfers([]));
    getRecurring().then(setRecurring).catch(() => setRecurring([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function switchCurrency(next: BalanceCurrency) {
    if (next === currency) return;
    setCurrency(next);
    loadBalance(next);
  }

  async function handleTopup() {
    setTopupBusy(true);
    setTopupNotice(null);
    try {
      const data = await topupWallet(topupAmount, currency);
      setBalance(data);
      setTopupNotice("Saldo berhasil ditambahkan.");
      setShowTopup(false);
    } catch (error) {
      setTopupNotice(error instanceof Error ? error.message : "Top up belum dapat diproses.");
    } finally {
      setTopupBusy(false);
    }
  }

  async function handleSkipRecurring(recurringId: string) {
    setDismissedRecurringIds((ids) => [...ids, recurringId]);
    try {
      await markRecurringSent(recurringId);
    } catch {
      // biarkan tersembunyi secara lokal walau permintaan gagal — pengguna sudah memutuskan "nanti dulu"
    }
  }

  const firstName = sender?.name?.split(" ")[0] || null;
  const dueSchedule = recurring.find((item) => item.dueNow && !dismissedRecurringIds.includes(item.recurringId));

  return (
    <AuthGuard>
      <AppShell mode="sender">
        <div className="mx-auto grid max-w-2xl gap-6 pb-12">
          <section>
            <p className="text-2xl font-extrabold tracking-[-.04em] text-ink">Halo, {firstName ?? "Halo"}</p>
            <p className="mt-1 text-sm text-muted">{todayLabel()} · Siap kirim sangu hari ini?</p>
          </section>

          <Card className="!bg-ink !text-white">
            <p className="text-sm text-white/60">Saldo kamu</p>
            {balanceLoading ? (
              <div className="mt-2 grid gap-2" aria-hidden="true">
                <div className="h-10 w-40 animate-pulse rounded-lg bg-white/15" />
                <div className="h-4 w-28 animate-pulse rounded-lg bg-white/10" />
              </div>
            ) : (
              <>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <p
                    className={`text-4xl font-extrabold tabular-nums tracking-[-.06em] ${hideBalance ? "select-none blur-md" : ""}`}
                    aria-hidden={hideBalance || undefined}
                  >
                    {balance ? `${CURRENCY_PREFIX[balance.currency]} ${formatAmount(balance.amount)}` : "—"}
                  </p>
                  <div className="flex shrink-0 items-center gap-1">
                    <CurrencyDropdown currency={currency} onChange={switchCurrency} />
                    <button
                      type="button"
                      onClick={() => setHideBalance((hidden) => !hidden)}
                      aria-label={hideBalance ? "Tampilkan saldo" : "Sembunyikan saldo"}
                      aria-pressed={hideBalance}
                      className="flex size-9 shrink-0 items-center justify-center rounded-[14px] text-white/70 transition hover:bg-white/10 hover:text-white"
                    >
                      {hideBalance ? <EyeOffIcon className="size-5" /> : <EyeIcon className="size-5" />}
                    </button>
                  </div>
                </div>
                <p
                  className={`mt-3 flex items-center gap-2 text-sm text-white/65 ${hideBalance ? "select-none blur-md" : ""}`}
                  aria-hidden={hideBalance || undefined}
                >
                  <span className="tabular-nums">{balance ? `≈ Rp ${formatIdr(balance.idrEstimate)}` : balanceError ?? "Saldo belum dapat dimuat."}</span>
                  {balance?.source === "demo" && (
                    <span className="rounded-full bg-white/15 px-2 py-0.5 text-xs font-bold">demo</span>
                  )}
                </p>
              </>
            )}
          </Card>

          <div className="grid grid-cols-2 gap-3">
            <Button variant="secondary" className="min-h-14 !text-base !font-extrabold" onClick={() => setShowTopup((open) => !open)}>
              {showTopup ? "Tutup" : "Isi saldo"}
            </Button>
            <a
              href="/send"
              className="flex min-h-14 items-center justify-center rounded-[14px] bg-brand px-6 py-4 text-base font-extrabold text-ink no-underline hover:bg-brand-hover"
            >
              Kirim uang
            </a>
          </div>

          {showTopup && (
            <Card>
              <div className="grid gap-3">
                <label className="text-xs font-semibold text-muted" htmlFor="topup-amount">
                  Nominal top up
                </label>
                <div className="relative">
                  <input
                    id="topup-amount"
                    inputMode="decimal"
                    className="w-full rounded-xl border border-line bg-canvas py-2 pl-3 pr-14 text-sm tabular-nums text-ink outline-none"
                    value={topupAmount}
                    onChange={(event) => setTopupAmount(event.target.value)}
                  />
                  <span aria-hidden className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm font-bold text-muted">{currency}</span>
                </div>
                <Button onClick={handleTopup} disabled={topupBusy} fullWidth>
                  {topupBusy ? "Memproses…" : "Tambah saldo"}
                </Button>
              </div>
            </Card>
          )}
          {topupNotice && (
            <p className="text-sm font-semibold text-ink" role="status">
              {topupNotice}
            </p>
          )}

          {dueSchedule && (
            <Card className="!border-peach !bg-peach-wash">
              <p className="text-sm font-bold text-brand-deep">
                Sangu Bulanan siap dikirim — {dueSchedule.recipientMasked} · RM {formatAmount(dueSchedule.amountForeign)}
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-4">
                <a
                  className="inline-flex min-h-11 items-center justify-center rounded-[14px] bg-brand px-5 py-3 text-sm font-extrabold text-ink no-underline hover:bg-brand-hover"
                  href={`/send?recipient=${encodeURIComponent(dueSchedule.recipientPhone ?? "")}&corridor=${dueSchedule.corridor}&amount=${encodeURIComponent(dueSchedule.amountForeign)}&recurringId=${dueSchedule.recurringId}`}
                >
                  Kirim sekarang
                </a>
                <button
                  type="button"
                  className="text-sm font-semibold text-muted underline-offset-2 hover:underline"
                  onClick={() => handleSkipRecurring(dueSchedule.recurringId)}
                >
                  Nanti dulu
                </button>
              </div>
            </Card>
          )}

          <section>
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-base font-extrabold text-ink">Terakhir dikirim</p>
              <a className="text-sm font-extrabold text-brand-deep no-underline hover:underline" href="/transfers">
                Lihat semua
              </a>
            </div>
            <Card>
              <TransferList transfers={transfers ?? []} limit={3} />
            </Card>
          </section>
        </div>
      </AppShell>
    </AuthGuard>
  );
}
