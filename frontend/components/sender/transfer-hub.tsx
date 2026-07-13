"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, SelectInput, TextInput } from "@/components/ui/field";
import { StatusBadge } from "@/components/ui/status-badge";
import { createRecurring, getTransfers, type Corridor, type RecurringRequest, type TransferSummary } from "@/lib/api";
import { filterTransfers, type TransferFilter } from "@/lib/transfer-history-presentation";

type TransferHubProps = {
  onStartTransfer: () => void;
  showHistory?: boolean;
  showRecurring?: boolean;
};

export function TransferHub({ onStartTransfer, showHistory = true, showRecurring = true }: TransferHubProps) {
  const [transfers, setTransfers] = useState<TransferSummary[] | null>(null);
  const [filter, setFilter] = useState<TransferFilter>("ALL");
  const [showForm, setShowForm] = useState(false);
  const [schedule, setSchedule] = useState<RecurringRequest>({ recipientPhone: "+628120000000", corridor: "MY", amountForeign: "500", dayOfMonth: 1 });
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!showHistory) return;
    getTransfers().then(setTransfers).catch(() => { setTransfers([]); setNotice("Riwayat belum dapat dimuat."); });
  }, [showHistory]);

  async function saveRecurring() {
    setBusy(true); setNotice(null);
    try {
      const response = await createRecurring(schedule);
      setNotice(`Sangu Bulanan aktif · ID ${response.recurringId}`);
      setShowForm(false);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Jadwal belum dapat disimpan.");
    } finally {
      setBusy(false);
    }
  }

  const filteredTransfers = transfers ? filterTransfers(transfers, filter) : [];
  const activeTransfers = filter === "ALL" ? filteredTransfers.filter((transfer) => transfer.status === "PENDING" || transfer.status === "CLAIMED") : [];
  const archivedTransfers = filter === "ALL" ? filteredTransfers.filter((transfer) => !activeTransfers.includes(transfer)) : filteredTransfers;

  return <section className="grid gap-5">
    {showHistory && <Card className="mt-1">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-2xl font-extrabold tracking-[-.04em]">Riwayat kiriman</p>
          <p className="mt-1 text-sm text-[#676767]">Pantau uang yang sedang menunggu atau sudah dicairkan.</p>
        </div>
        <Button onClick={onStartTransfer}>Kirim</Button>
      </div>

      {transfers === null ? <p className="mt-8 text-sm text-[#676767]">Memuat riwayat…</p> : <>
        <div className="mt-5 flex gap-2 overflow-x-auto pb-1" aria-label="Filter status">
          <FilterButton active={filter === "ALL"} onClick={() => setFilter("ALL")}>Semua</FilterButton>
          <FilterButton active={filter === "PENDING"} onClick={() => setFilter("PENDING")}>Menunggu</FilterButton>
          <FilterButton active={filter === "CLAIMED"} onClick={() => setFilter("CLAIMED")}>Diproses</FilterButton>
          <FilterButton active={filter === "PAID_OUT"} onClick={() => setFilter("PAID_OUT")}>Selesai</FilterButton>
          <FilterButton active={filter === "REFUNDED"} onClick={() => setFilter("REFUNDED")}>Dikembalikan</FilterButton>
          <FilterButton active={filter === "EXPIRED"} onClick={() => setFilter("EXPIRED")}>Kedaluwarsa</FilterButton>
        </div>

        {filteredTransfers.length === 0 ? <EmptyHistory filter={filter} onStartTransfer={onStartTransfer} /> : <div className="mt-6 grid gap-6">
          {activeTransfers.length > 0 && <section aria-labelledby="active-transfers-heading">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h2 id="active-transfers-heading" className="text-base font-extrabold">Kiriman aktif</h2>
                <p className="mt-0.5 text-xs text-[#676767]">Masih menunggu pencairan penerima.</p>
              </div>
              <span className="rounded-full bg-[#fff4eb] px-2.5 py-1 text-xs font-bold text-[#9e1d0e]">{activeTransfers.length}</span>
            </div>
            <TransferList transfers={activeTransfers} emphasis />
          </section>}
          {archivedTransfers.length > 0 && <section aria-labelledby="previous-transfers-heading">
            {activeTransfers.length > 0 && <h2 id="previous-transfers-heading" className="mb-3 text-sm font-bold text-[#676767]">Riwayat sebelumnya</h2>}
            <TransferList transfers={archivedTransfers} />
          </section>}
        </div>}
      </>}
    </Card>}

    {showRecurring && <Card>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xl font-extrabold tracking-[-.04em]">Sangu Bulanan</p>
          <p className="mt-1 text-sm text-[#676767]">Siapkan kiriman rutin untuk keluarga.</p>
        </div>
        <Button variant="secondary" onClick={() => setShowForm((open) => !open)}>{showForm ? "Tutup" : "Atur"}</Button>
      </div>
      {showForm && <div className="mt-6 grid gap-4">
        <Field label="Nomor penerima"><TextInput inputMode="tel" value={schedule.recipientPhone} onChange={(event) => setSchedule({ ...schedule, recipientPhone: event.target.value })} /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Koridor"><SelectInput value={schedule.corridor} onChange={(event) => setSchedule({ ...schedule, corridor: event.target.value as Corridor })}><option value="MY">Malaysia</option><option value="HK">Hong Kong</option></SelectInput></Field>
          <Field label="Jumlah"><TextInput inputMode="decimal" value={schedule.amountForeign} onChange={(event) => setSchedule({ ...schedule, amountForeign: event.target.value })} /></Field>
        </div>
        <Field label="Tanggal tiap bulan"><SelectInput value={schedule.dayOfMonth} onChange={(event) => setSchedule({ ...schedule, dayOfMonth: Number(event.target.value) })}>{[1, 5, 10, 15, 20, 25].map((day) => <option key={day} value={day}>Tanggal {day}</option>)}</SelectInput></Field>
        <p className="rounded-2xl bg-[#fff4eb] p-3 text-xs text-[#9e1d0e]">Setiap kiriman tetap memerlukan otorisasi passkey sampai kebijakan recurring on-chain tersedia.</p>
        <Button fullWidth onClick={saveRecurring} disabled={busy}>{busy ? "Menyimpan…" : "Simpan jadwal"}</Button>
      </div>}
    </Card>}
    {notice && <p className="text-sm font-semibold text-[#9e1d0e]" role="status">{notice}</p>}
  </section>;
}

function EmptyHistory({ filter, onStartTransfer }: { filter: TransferFilter; onStartTransfer: () => void }) {
  const allTransfers = filter === "ALL";
  return <div className="mt-8 rounded-3xl bg-[#fcfcfc] p-6 text-center">
    <p className="text-lg font-bold">{allTransfers ? "Belum ada kiriman." : "Belum ada kiriman pada status ini."}</p>
    <p className="mt-2 text-sm text-[#676767]">{allTransfers ? "Kirim pertama kali untuk melihat statusnya di sini." : "Ubah filter atau buat kiriman baru."}</p>
    <Button className="mt-5" onClick={onStartTransfer}>{allTransfers ? "Kirim uang pertama" : "Kirim uang"}</Button>
  </div>;
}

function TransferList({ transfers, emphasis = false }: { transfers: TransferSummary[]; emphasis?: boolean }) {
  return <div className="grid gap-3">
    {transfers.map((transfer) => <a className={`block rounded-2xl border p-4 text-left transition-colors hover:border-[#080808] ${emphasis ? "border-[#f1c7a9] bg-[#fffaf6]" : "border-[#ededed]"}`} key={transfer.transferId} href={`/transfers/${transfer.transferId}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <strong className="block">Rp {Number(transfer.amount).toLocaleString("id-ID")}</strong>
          <span className="text-sm text-[#676767]">{transfer.recipientMasked} · {new Date(transfer.createdAt).toLocaleDateString("id-ID")}</span>
        </div>
        <StatusBadge status={transfer.status} />
      </div>
    </a>)}
  </div>;
}

function FilterButton({ active, children, onClick }: { active: boolean; children: string; onClick: () => void }) {
  return <button type="button" className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold ${active ? "bg-[#080808] text-white" : "bg-[#fcfcfc] text-[#676767]"}`} aria-pressed={active} onClick={onClick}>{children}</button>;
}
