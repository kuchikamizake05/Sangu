"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, TextInput } from "@/components/ui/field";
import { deleteRecurring, getRecurring, setRecurringStatus, updateRecurring, type RecurringSchedule } from "@/lib/api";

type PendingAction = { kind: "pause" | "resume" | "delete"; schedule: RecurringSchedule } | null;

export function RecurringManager() {
  const [schedules, setSchedules] = useState<RecurringSchedule[] | null>(null);
  const [editing, setEditing] = useState<RecurringSchedule | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const actionTriggerRef = useRef<HTMLButtonElement | null>(null);
  const actionDialogRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => { getRecurring().then(setSchedules).catch(() => { setSchedules([]); setNotice("Jadwal belum dapat dimuat."); }); }, []);
  useEffect(() => {
    if (pendingAction) {
      actionDialogRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
    } else {
      actionTriggerRef.current?.focus();
    }
  }, [pendingAction]);
  useEffect(() => {
    if (!pendingAction) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setPendingAction(null);
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [pendingAction]);

  function openAction(action: Exclude<PendingAction, null>, trigger: HTMLButtonElement) {
    actionTriggerRef.current = trigger;
    setPendingAction(action);
  }

  async function confirmAction() {
    if (!pendingAction) return;
    setBusy(true); setNotice(null);
    try {
      if (pendingAction.kind === "delete") {
        await deleteRecurring(pendingAction.schedule.recurringId);
        setSchedules((items) => items?.filter((item) => item.recurringId !== pendingAction.schedule.recurringId) ?? []);
        setNotice("Jadwal dihapus.");
      } else {
        const status = (await setRecurringStatus(pendingAction.schedule.recurringId, pendingAction.kind)).status;
        setSchedules((items) => items?.map((item) => item.recurringId === pendingAction.schedule.recurringId ? { ...item, status } : item) ?? []);
        setNotice(status === "PAUSED" ? "Jadwal dijeda." : "Jadwal dilanjutkan.");
      }
      setPendingAction(null);
    } catch { setNotice("Aksi belum dapat diproses. Coba lagi."); }
    finally { setBusy(false); }
  }

  async function saveEdit() {
    if (!editing) return;
    setBusy(true); setNotice(null);
    try {
      const updated = await updateRecurring(editing.recurringId, { amountForeign: editing.amountForeign, dayOfMonth: editing.dayOfMonth });
      setSchedules((items) => items?.map((item) => item.recurringId === updated.recurringId ? updated : item) ?? []);
      setEditing(null); setNotice("Jadwal diperbarui.");
    } catch { setNotice("Perubahan belum dapat disimpan."); }
    finally { setBusy(false); }
  }

  const activeSchedules = schedules?.filter((schedule) => schedule.status === "ACTIVE") ?? [];
  const pausedSchedules = schedules?.filter((schedule) => schedule.status === "PAUSED") ?? [];

  return <section className="grid gap-5">
    <Card>
      <p className="text-xs font-extrabold tracking-[.15em] text-brand-deep">JADWAL RUTIN</p>
      <h1 className="mt-2 text-3xl font-extrabold tracking-[-.05em]">Sangu Bulanan</h1>
      <p className="mt-2 text-sm text-muted">Setiap jadwal tetap meminta otorisasi passkey saat waktunya mengirim. Sangu tidak melakukan auto-debit.</p>
      {schedules && schedules.length > 0 && <div className="mt-5 flex gap-2 text-sm">
        <span className="rounded-full bg-success-wash px-3 py-1 font-bold text-success">{activeSchedules.length} aktif</span>
        {pausedSchedules.length > 0 && <span className="rounded-full bg-line px-3 py-1 font-bold text-muted">{pausedSchedules.length} dijeda</span>}
      </div>}
    </Card>

    <Card>
      {schedules === null ? <p className="text-sm text-muted">Memuat jadwal…</p> : schedules.length === 0 ? <p className="text-center text-sm text-muted">Belum ada jadwal. Buat jadwal dari Beranda untuk mulai.</p> : <div className="grid gap-6">
        {activeSchedules.length > 0 && <section aria-labelledby="active-schedules-heading">
          <div className="mb-3 flex items-center justify-between"><h2 id="active-schedules-heading" className="text-base font-extrabold">Jadwal aktif</h2><span className="text-xs font-bold text-brand-deep">{activeSchedules.length}</span></div>
          <ScheduleList schedules={activeSchedules} onEdit={setEditing} onAction={openAction} />
        </section>}
        {pausedSchedules.length > 0 && <section aria-labelledby="paused-schedules-heading">
          <div className="mb-3 flex items-center justify-between"><h2 id="paused-schedules-heading" className="text-sm font-bold text-muted">Jadwal dijeda</h2><span className="text-xs font-bold text-muted">{pausedSchedules.length}</span></div>
          <ScheduleList schedules={pausedSchedules} onEdit={setEditing} onAction={openAction} />
        </section>}
      </div>}
    </Card>

    {editing && <Card>
      <h2 className="text-xl font-extrabold">Edit jadwal</h2>
      <div className="mt-5 grid gap-4">
        <Field label="Jumlah"><TextInput inputMode="decimal" value={editing.amountForeign} onChange={(event) => setEditing({ ...editing, amountForeign: event.target.value })} /></Field>
        <Field label="Tanggal tiap bulan"><TextInput inputMode="numeric" value={String(editing.dayOfMonth)} onChange={(event) => setEditing({ ...editing, dayOfMonth: Number(event.target.value) })} /></Field>
        <div className="grid gap-2 sm:grid-cols-2"><Button variant="secondary" onClick={() => setEditing(null)}>Batal</Button><Button onClick={saveEdit} disabled={busy}>Simpan perubahan</Button></div>
      </div>
    </Card>}

    {pendingAction && <div ref={actionDialogRef} className="fixed inset-0 z-50 grid place-items-end bg-black/35 p-4 sm:place-items-center" role="dialog" aria-modal="true" aria-labelledby="schedule-action-title">
      <Card className="w-full max-w-lg shadow-2xl">
        <h2 id="schedule-action-title" className="text-xl font-extrabold">{pendingAction.kind === "delete" ? "Hapus jadwal ini?" : `${pendingAction.kind === "pause" ? "Jeda" : "Lanjutkan"} jadwal ini?`}</h2>
        <p className="mt-2 text-sm text-muted">{pendingAction.kind === "delete" ? "Jadwal yang dihapus tidak dapat dipulihkan." : "Pengaturan dapat diubah lagi kapan saja."}</p>
        <div className="mt-5 grid gap-2 sm:grid-cols-2"><Button variant="secondary" onClick={() => setPendingAction(null)}>Batal</Button><Button onClick={confirmAction} disabled={busy}>{pendingAction.kind === "pause" ? "Konfirmasi jeda" : pendingAction.kind === "resume" ? "Konfirmasi lanjutkan" : "Konfirmasi hapus"}</Button></div>
      </Card>
    </div>}
    {notice && <p role="status" className="text-sm font-semibold text-brand-deep">{notice}</p>}
  </section>;
}

function ScheduleList({ schedules, onEdit, onAction }: { schedules: RecurringSchedule[]; onEdit: (schedule: RecurringSchedule) => void; onAction: (action: Exclude<PendingAction, null>, trigger: HTMLButtonElement) => void }) {
  return <div className="grid gap-4">
    {schedules.map((schedule) => <article className={`rounded-3xl border p-5 ${schedule.status === "ACTIVE" ? "border-line bg-surface" : "border-line bg-canvas"}`} key={schedule.recurringId}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <strong className="block truncate text-lg">{schedule.recipientMasked}</strong>
          <p className="mt-1 tabular-nums text-sm text-muted">{schedule.corridor === "MY" ? "Malaysia" : "Hong Kong"} · {schedule.amountForeign} · tiap tanggal {schedule.dayOfMonth}</p>
          <p className="mt-2 text-xs font-semibold text-muted">Berikutnya {new Date(schedule.nextRunAt).toLocaleDateString("id-ID")}</p>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${schedule.status === "ACTIVE" ? "bg-success-wash text-success" : "bg-line text-muted"}`}>{schedule.status === "ACTIVE" ? "Aktif" : "Dijeda"}</span>
      </div>
      {schedule.dueNow && <p className="mt-3 rounded-xl bg-peach-wash px-3 py-2 text-xs font-semibold text-brand-deep">Siap dikirim bulan ini</p>}
      <div className="mt-4 grid gap-2 sm:grid-cols-3"><Button variant="secondary" onClick={() => onEdit({ ...schedule })}>Edit</Button><Button variant="secondary" onClick={(event) => onAction({ kind: schedule.status === "ACTIVE" ? "pause" : "resume", schedule }, event.currentTarget)}>{schedule.status === "ACTIVE" ? "Jeda jadwal" : "Lanjutkan"}</Button><Button variant="ghost" onClick={(event) => onAction({ kind: "delete", schedule }, event.currentTarget)}>Hapus</Button></div>
    </article>)}
  </div>;
}
