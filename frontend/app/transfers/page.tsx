"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { AuthGuard } from "@/components/auth-guard";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TransferList } from "@/components/sender/transfer-list";
import { getTransfers, type TransferSummary } from "@/lib/api";
import { filterTransfers, type TransferFilter } from "@/lib/transfer-history-presentation";

const filterOptions: { value: TransferFilter; label: string }[] = [
  { value: "ALL", label: "Semua" },
  { value: "PENDING", label: "Menunggu" },
  { value: "CLAIMED", label: "Diproses" },
  { value: "PAID_OUT", label: "Selesai" },
  { value: "REFUNDED", label: "Dikembalikan" },
  { value: "EXPIRED", label: "Kedaluwarsa" },
];

const monthFormatter = new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric" });

function monthKey(isoDate: string): string {
  const date = new Date(isoDate);
  return `${date.getFullYear()}-${String(date.getMonth()).padStart(2, "0")}`;
}

function monthLabel(isoDate: string): string {
  const label = monthFormatter.format(new Date(isoDate));
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function groupByMonth(transfers: TransferSummary[]): Array<{ key: string; label: string; transfers: TransferSummary[] }> {
  const groups = new Map<string, { key: string; label: string; transfers: TransferSummary[] }>();
  for (const transfer of transfers) {
    const key = monthKey(transfer.createdAt);
    if (!groups.has(key)) groups.set(key, { key, label: monthLabel(transfer.createdAt), transfers: [] });
    groups.get(key)!.transfers.push(transfer);
  }
  return [...groups.values()];
}

export default function TransfersPage() {
  const [transfers, setTransfers] = useState<TransferSummary[] | null>(null);
  const [error, setError] = useState(false);
  const [filter, setFilter] = useState<TransferFilter>("ALL");
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setTransfers(null);
    setError(false);
    getTransfers()
      .then((result) => { if (!cancelled) setTransfers(result); })
      .catch(() => { if (!cancelled) { setTransfers([]); setError(true); } });
    return () => { cancelled = true; };
  }, [reloadToken]);

  const filtered = transfers ? filterTransfers(transfers, filter) : [];
  const groups = useMemo(() => groupByMonth(filtered), [filtered]);

  return <AuthGuard><AppShell><div className="mx-auto max-w-2xl pb-12 lg:max-w-3xl">
    <p className="mt-1 text-xs font-extrabold tracking-[.15em] text-brand-deep">RIWAYAT</p>
    <h1 className="mt-2 text-3xl font-extrabold tracking-[-.05em]">Aktivitas</h1>
    <p className="mt-2 text-sm text-muted">Pantau semua kiriman yang pernah kamu buat.</p>

    <div className="mt-6 -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0" aria-label="Filter status">
      {filterOptions.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={filter === option.value}
          onClick={() => setFilter(option.value)}
          className={`min-h-8 shrink-0 rounded-[10px] px-3 py-1.5 text-xs font-bold transition-colors ${filter === option.value ? "bg-ink text-white" : "bg-canvas text-muted"}`}
        >
          {option.label}
        </button>
      ))}
    </div>

    <Card className="mt-5">
      {transfers === null ? <TransfersSkeleton /> : error ? (
        <div className="py-6 text-center">
          <p className="text-sm font-semibold text-ink">Riwayat belum dapat dimuat.</p>
          <p className="mt-1 text-sm text-muted">Periksa koneksi kamu lalu coba lagi.</p>
          <Button className="mt-4" variant="secondary" onClick={() => setReloadToken((token) => token + 1)}>Coba lagi</Button>
        </div>
      ) : groups.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted">Belum ada kiriman pada status ini.</p>
      ) : (
        <div className="grid gap-6">
          {groups.map((group) => (
            <section key={group.key} aria-labelledby={`month-${group.key}`}>
              <h2 id={`month-${group.key}`} className="mb-1 text-sm font-bold text-muted">{group.label}</h2>
              <TransferList transfers={group.transfers} />
            </section>
          ))}
        </div>
      )}
    </Card>
  </div></AppShell></AuthGuard>;
}

function TransfersSkeleton() {
  return <div className="grid gap-4" aria-hidden>
    {[0, 1, 2].map((row) => (
      <div key={row} className="flex items-center justify-between gap-3 py-1">
        <div className="flex items-center gap-3">
          <div className="size-10 shrink-0 animate-pulse rounded-full bg-canvas" />
          <div>
            <div className="h-3 w-28 animate-pulse rounded bg-canvas" />
            <div className="mt-2 h-2.5 w-16 animate-pulse rounded bg-canvas" />
          </div>
        </div>
        <div className="h-3 w-16 animate-pulse rounded bg-canvas" />
      </div>
    ))}
  </div>;
}
