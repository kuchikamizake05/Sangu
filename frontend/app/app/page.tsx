"use client";

import { useEffect, useState } from "react";
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
  type RecurringSchedule,
  type TransferSummary,
  type WalletBalance,
} from "@/lib/api";
import { useSession } from "@/lib/auth-session";

const CURRENCY_PREFIX: Record<WalletBalance["currency"], string> = { MYR: "RM", HKD: "HK$" };

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
  const [topupAmount, setTopupAmount] = useState("100");
  const [topupBusy, setTopupBusy] = useState(false);
  const [topupNotice, setTopupNotice] = useState<string | null>(null);

  function loadBalance() {
    setBalanceLoading(true);
    setBalanceError(null);
    getWalletBalance()
      .then((data) => setBalance(data))
      .catch((error) => setBalanceError(error instanceof Error ? error.message : "Saldo belum dapat dimuat."))
      .finally(() => setBalanceLoading(false));
  }

  useEffect(() => {
    loadBalance();
    getTransfers().then(setTransfers).catch(() => setTransfers([]));
    getRecurring().then(setRecurring).catch(() => setRecurring([]));
  }, []);

  async function handleTopup() {
    setTopupBusy(true);
    setTopupNotice(null);
    try {
      const data = await topupWallet(topupAmount);
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
              <div className="mt-3 grid gap-2" aria-hidden="true">
                <div className="h-10 w-40 animate-pulse rounded-lg bg-white/15" />
                <div className="h-4 w-28 animate-pulse rounded-lg bg-white/10" />
              </div>
            ) : (
              <>
                <p className="mt-2 text-4xl font-extrabold tabular-nums tracking-[-.06em]">
                  {balance ? `${CURRENCY_PREFIX[balance.currency]} ${formatAmount(balance.amount)}` : "—"}
                </p>
                <p className="mt-3 flex items-center gap-2 text-sm text-white/65">
                  <span className="tabular-nums">{balance ? `≈ Rp ${formatIdr(balance.idrEstimate)}` : balanceError ?? "Saldo belum dapat dimuat."}</span>
                  {balance?.source === "demo" && (
                    <span className="rounded-full bg-white/15 px-2 py-0.5 text-xs font-bold">demo</span>
                  )}
                </p>
              </>
            )}

            <div className="mt-5">
              <Button variant="secondary" onClick={() => setShowTopup((open) => !open)}>
                {showTopup ? "Tutup" : "Isi saldo"}
              </Button>
            </div>

            {showTopup && (
              <div className="mt-4 grid gap-3 rounded-2xl bg-white/10 p-4">
                <label className="text-xs font-semibold text-white/70" htmlFor="topup-amount">
                  Nominal top up
                </label>
                <input
                  id="topup-amount"
                  inputMode="decimal"
                  className="rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-sm tabular-nums text-white outline-none"
                  value={topupAmount}
                  onChange={(event) => setTopupAmount(event.target.value)}
                />
                <Button onClick={handleTopup} disabled={topupBusy} fullWidth>
                  {topupBusy ? "Memproses…" : "Tambah saldo"}
                </Button>
              </div>
            )}
            {topupNotice && (
              <p className="mt-3 text-sm font-semibold text-white/80" role="status">
                {topupNotice}
              </p>
            )}
          </Card>

          <a
            href="/send"
            className="flex min-h-14 w-full items-center justify-center rounded-full bg-brand px-6 py-4 text-base font-extrabold text-ink no-underline hover:bg-brand-hover"
          >
            Kirim uang
          </a>

          {dueSchedule && (
            <Card className="!border-peach !bg-peach-wash">
              <p className="text-sm font-bold text-brand-deep">
                Sangu Bulanan siap dikirim — {dueSchedule.recipientMasked} · RM {formatAmount(dueSchedule.amountForeign)}
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-4">
                <a
                  className="inline-flex min-h-11 items-center justify-center rounded-full bg-brand px-5 py-3 text-sm font-extrabold text-ink no-underline hover:bg-brand-hover"
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
