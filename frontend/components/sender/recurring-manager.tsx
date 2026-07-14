"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, TextInput } from "@/components/ui/field";
import { createRecurring, deleteRecurring, getRecurring, setRecurringStatus, updateRecurring, type Corridor, type RecurringSchedule } from "@/lib/api";
import { PauseIcon, PencilIcon, PlayIcon, TrashIcon } from "@/components/ui/icons";
import { isE164Phone } from "@/lib/send-flow";

type PendingAction = { kind: "pause" | "resume" | "delete"; schedule: RecurringSchedule } | null;

type CreateForm = { recipientPhone: string; corridor: Corridor; amountForeign: string; dayOfMonth: string };
const EMPTY_CREATE_FORM: CreateForm = { recipientPhone: "", corridor: "MY", amountForeign: "", dayOfMonth: "1" };

export function RecurringManager() {
  const [schedules, setSchedules] = useState<RecurringSchedule[] | null>(null);
  const [editing, setEditing] = useState<RecurringSchedule | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState<CreateForm>(EMPTY_CREATE_FORM);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const actionTriggerRef = useRef<HTMLButtonElement | null>(null);
  const actionDialogRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => { getRecurring().then(setSchedules).catch(() => setSchedules([])); }, []);
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
  useEffect(() => {
    if (!editing) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setEditing(null);
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [editing]);

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
      } else {
        const status = (await setRecurringStatus(pendingAction.schedule.recurringId, pendingAction.kind)).status;
        setSchedules((items) => items?.map((item) => item.recurringId === pendingAction.schedule.recurringId ? { ...item, status } : item) ?? []);
      }
      setPendingAction(null);
    } catch { setNotice("Aksi belum dapat diproses. Coba lagi."); }
    finally { setBusy(false); }
  }

  async function saveCreate() {
    if (!isE164Phone(createForm.recipientPhone)) { setNotice("Nomor penerima harus format internasional, contoh +62812…"); return; }
    const amount = Number(createForm.amountForeign);
    if (!Number.isFinite(amount) || amount <= 0) { setNotice("Masukkan jumlah kiriman yang valid."); return; }
    const day = Number(createForm.dayOfMonth);
    if (!Number.isInteger(day) || day < 1 || day > 28) { setNotice("Tanggal harus antara 1 sampai 28."); return; }

    setBusy(true); setNotice(null);
    try {
      await createRecurring({ recipientPhone: createForm.recipientPhone, corridor: createForm.corridor, amountForeign: createForm.amountForeign, dayOfMonth: day });
      setSchedules(await getRecurring());
      setShowCreate(false);
      setCreateForm(EMPTY_CREATE_FORM);
    } catch { setNotice("Jadwal belum dapat disimpan. Coba lagi."); }
    finally { setBusy(false); }
  }

  async function saveEdit() {
    if (!editing) return;
    setBusy(true); setNotice(null);
    try {
      const updated = await updateRecurring(editing.recurringId, { amountForeign: editing.amountForeign, dayOfMonth: editing.dayOfMonth });
      setSchedules((items) => items?.map((item) => item.recurringId === updated.recurringId ? updated : item) ?? []);
      setEditing(null);
    } catch { setNotice("Perubahan belum dapat disimpan."); }
    finally { setBusy(false); }
  }

  const activeSchedules = schedules?.filter((schedule) => schedule.status === "ACTIVE") ?? [];
  const pausedSchedules = schedules?.filter((schedule) => schedule.status === "PAUSED") ?? [];

  return <section className="grid gap-5">
    <Card>
      <p className="text-xs font-extrabold tracking-[.15em] text-brand-deep">JADWAL RUTIN</p>
      <h1 className="mt-2 text-3xl font-extrabold tracking-[-.05em]">Sangu Bulanan</h1>
      <p className="mt-2 text-sm text-muted">Setiap jadwal tetap meminta konfirmasi sidik jari saat waktunya mengirim. Sangu tidak melakukan auto-debit.</p>
      <Button className="mt-5" onClick={() => { setShowCreate((open) => !open); setNotice(null); }}>
        {showCreate ? "Tutup form" : "Buat jadwal baru"}
      </Button>
    </Card>

    {showCreate && <Card>
      <h2 className="text-xl font-extrabold">Jadwal baru</h2>
      <div className="mt-5 grid gap-4">
        <Field label="Nomor penerima"><TextInput inputMode="tel" placeholder="+62812…" value={createForm.recipientPhone} onChange={(event) => setCreateForm({ ...createForm, recipientPhone: event.target.value })} /></Field>
        <div>
          <p className="mb-2 text-xs font-semibold text-muted">Kirim dari</p>
          <div className="flex gap-2" role="group" aria-label="Negara asal kiriman">
            {([["MY", "Malaysia"], ["HK", "Hong Kong"]] as const).map(([value, label]) => (
              <button key={value} type="button" aria-pressed={createForm.corridor === value} onClick={() => setCreateForm({ ...createForm, corridor: value })} className={`rounded-[14px] border px-4 py-2 text-sm font-bold transition ${createForm.corridor === value ? "border-brand bg-peach text-brand-deep" : "border-line text-ink hover:border-ink"}`}>
                {label}
              </button>
            ))}
          </div>
        </div>
        <Field label={createForm.corridor === "MY" ? "Jumlah (RM)" : "Jumlah (HK$)"}><TextInput inputMode="decimal" placeholder="100" value={createForm.amountForeign} onChange={(event) => setCreateForm({ ...createForm, amountForeign: event.target.value })} /></Field>
        <Field label="Tanggal tiap bulan (1–28)"><TextInput inputMode="numeric" value={createForm.dayOfMonth} onChange={(event) => setCreateForm({ ...createForm, dayOfMonth: event.target.value })} /></Field>
        <div className="grid gap-2 sm:grid-cols-2"><Button variant="secondary" onClick={() => setShowCreate(false)}>Batal</Button><Button onClick={saveCreate} disabled={busy}>{busy ? "Menyimpan…" : "Simpan jadwal"}</Button></div>
        {notice && <p role="status" className="text-sm font-semibold text-danger">{notice}</p>}
      </div>
    </Card>}

    <Card>
      {schedules === null ? <p className="text-sm text-muted">Memuat jadwal…</p> : schedules.length === 0 ? <p className="text-center text-sm text-muted">Belum ada jadwal. Tekan "Buat jadwal baru" untuk mulai.</p> : <div className="grid gap-6">
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

    {editing && <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/35" role="dialog" aria-modal="true" aria-labelledby="schedule-edit-title">
      <div className="w-full max-w-lg rounded-t-[30px] bg-surface p-6 pb-[calc(24px+env(safe-area-inset-bottom))] shadow-[0_-8px_30px_rgba(0,0,0,0.06)]">
        <h2 id="schedule-edit-title" className="text-xl font-extrabold tracking-[-.04em]">Edit jadwal</h2>
        <div className="mt-5 grid gap-4">
          <Field label={editing.corridor === "MY" ? "Jumlah (MYR)" : "Jumlah (HKD)"}><TextInput inputMode="decimal" value={editing.amountForeign} onChange={(event) => setEditing({ ...editing, amountForeign: event.target.value })} /></Field>
          <Field label="Tanggal tiap bulan"><TextInput inputMode="numeric" value={String(editing.dayOfMonth)} onChange={(event) => setEditing({ ...editing, dayOfMonth: Number(event.target.value) })} /></Field>
          <div className="grid gap-2 sm:grid-cols-2"><Button variant="secondary" onClick={() => setEditing(null)}>Batal</Button><Button onClick={saveEdit} disabled={busy}>Simpan</Button></div>
          {notice && <p role="status" className="text-sm font-semibold text-danger">{notice}</p>}
        </div>
      </div>
    </div>}

    {pendingAction && <div ref={actionDialogRef} className="fixed inset-0 z-50 grid place-items-end bg-black/35 p-4 sm:place-items-center" role="dialog" aria-modal="true" aria-labelledby="schedule-action-title">
      <Card className="w-full max-w-lg shadow-2xl">
        <h2 id="schedule-action-title" className="text-xl font-extrabold">{pendingAction.kind === "delete" ? "Hapus jadwal ini?" : `${pendingAction.kind === "pause" ? "Jeda" : "Lanjutkan"} jadwal ini?`}</h2>
        <p className="mt-2 text-sm text-muted">{pendingAction.kind === "delete" ? "Jadwal yang dihapus tidak dapat dipulihkan." : "Pengaturan dapat diubah lagi kapan saja."}</p>
        <div className="mt-5 grid gap-2 sm:grid-cols-2"><Button variant="secondary" onClick={() => setPendingAction(null)}>Batal</Button><Button onClick={confirmAction} disabled={busy}>{pendingAction.kind === "pause" ? "Konfirmasi jeda" : pendingAction.kind === "resume" ? "Konfirmasi lanjutkan" : "Konfirmasi hapus"}</Button></div>
      </Card>
    </div>}
  </section>;
}

function ScheduleList({ schedules, onEdit, onAction }: { schedules: RecurringSchedule[]; onEdit: (schedule: RecurringSchedule) => void; onAction: (action: Exclude<PendingAction, null>, trigger: HTMLButtonElement) => void }) {
  const iconButton = "flex size-9 items-center justify-center rounded-[14px] text-muted transition hover:bg-canvas hover:text-ink";

  return <div className="grid gap-4">
    {schedules.map((schedule) => <article className={`rounded-3xl border p-5 ${schedule.status === "ACTIVE" ? "border-line bg-surface" : "border-line bg-canvas"}`} key={schedule.recurringId}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <strong className="block truncate text-lg">{schedule.recipientMasked}</strong>
          <p className="mt-1 tabular-nums text-sm text-muted">{schedule.amountForeign} {schedule.corridor === "MY" ? "MYR" : "HKD"} - tiap tanggal {schedule.dayOfMonth}</p>
        </div>
        <span className={`shrink-0 text-xs font-bold ${schedule.status === "ACTIVE" ? "text-success" : "text-muted"}`}>{schedule.status === "ACTIVE" ? "Aktif" : "Dijeda"}</span>
      </div>
      {schedule.dueNow && <p className="mt-3 rounded-xl bg-peach-wash px-3 py-2 text-xs font-semibold text-brand-deep">Siap dikirim bulan ini</p>}
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold text-muted">Berikutnya {new Date(schedule.nextRunAt).toLocaleDateString("id-ID")}</p>
        <div className="flex gap-1">
          <button type="button" aria-label="Edit jadwal" title="Edit" className={iconButton} onClick={() => onEdit({ ...schedule })}><PencilIcon className="size-4.5" /></button>
          <button type="button" aria-label={schedule.status === "ACTIVE" ? "Jeda jadwal" : "Lanjutkan jadwal"} title={schedule.status === "ACTIVE" ? "Jeda" : "Lanjutkan"} className={iconButton} onClick={(event) => onAction({ kind: schedule.status === "ACTIVE" ? "pause" : "resume", schedule }, event.currentTarget)}>{schedule.status === "ACTIVE" ? <PauseIcon className="size-4.5" /> : <PlayIcon className="size-4.5" />}</button>
          <button type="button" aria-label="Hapus jadwal" title="Hapus" className={`${iconButton} hover:!text-danger`} onClick={(event) => onAction({ kind: "delete", schedule }, event.currentTarget)}><TrashIcon className="size-4.5" /></button>
        </div>
      </div>
    </article>)}
  </div>;
}
