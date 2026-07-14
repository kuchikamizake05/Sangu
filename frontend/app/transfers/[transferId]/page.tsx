"use client";

import { use, useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { AuthGuard } from "@/components/auth-guard";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { getTransferDetail, type TransferDetail } from "@/lib/api";

const stages = ["CREATED", "DEPOSITED", "CLAIMED", "PAID_OUT"] as const;
const labels = { CREATED: "Transfer dibuat", DEPOSITED: "Uang kamu diamankan", CLAIMED: "Penerima memulai pencairan", PAID_OUT: "Dana dicairkan", REFUNDED: "Dana dikembalikan", EXPIRED: "Transfer kedaluwarsa" } as const;
const anchorTerminalStatuses = new Set(["completed", "refunded", "expired", "error", "no_market"]);

export default function TransferDetailPage({ params }: { params: Promise<{ transferId: string }> }) {
  const { transferId } = use(params);
  const [transfer, setTransfer] = useState<TransferDetail | null | undefined>();

  useEffect(() => { getTransferDetail(transferId).then(setTransfer).catch(() => setTransfer(null)); }, [transferId]);

  const shouldPollAnchor = Boolean(transfer?.anchor && !anchorTerminalStatuses.has(transfer.anchor.status ?? ""));
  useEffect(() => {
    if (!shouldPollAnchor) return;
    const interval = window.setInterval(() => { getTransferDetail(transferId).then(setTransfer).catch(() => undefined); }, 10_000);
    return () => window.clearInterval(interval);
  }, [shouldPollAnchor, transferId]);

  if (transfer === undefined) return <AuthGuard><AppShell><Card className="mx-auto max-w-2xl text-muted">Memuat detail transfer…</Card></AppShell></AuthGuard>;
  if (!transfer) return <AuthGuard><AppShell><Card className="mx-auto max-w-2xl">Transfer tidak ditemukan.</Card></AppShell></AuthGuard>;

  const actual = new Map(transfer.events.map((event) => [event.type, event.occurredAt]));
  const timeline = transfer.status === "REFUNDED" || transfer.status === "EXPIRED" ? [...transfer.events] : stages.map((type) => ({ type, occurredAt: actual.get(type) }));
  const latest = Math.max(0, timeline.reduce((last, event, index) => event.occurredAt ? index : last, 0));

  return <AuthGuard><AppShell><div className="mx-auto max-w-2xl pb-12">
    <a className="text-sm font-semibold text-muted underline" href="/transfers">← Kembali ke riwayat</a>
    <p className="mt-7 text-xs font-extrabold tracking-[.15em] text-brand-deep">DETAIL TRANSFER</p>
    <Card className="mt-3">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="tabular-nums text-4xl font-extrabold tracking-[-.06em]">Rp {Number(transfer.amount).toLocaleString("id-ID")}</h1>
          <p className="mt-2 text-sm text-muted">Ke {transfer.recipientMasked}</p>
        </div>
        <StatusBadge status={transfer.status} />
      </div>
    </Card>
    {transfer.anchor && <AnchorStatus anchor={transfer.anchor} />}
    <Card className="mt-6">
      <p className="text-sm font-bold">Perjalanan kiriman</p>
      <ol className="mt-6 grid gap-0">{timeline.map((event, index) => {
        const state = event.occurredAt ? "complete" : index === latest + 1 ? "current" : "upcoming";
        const isLast = index === timeline.length - 1;
        return <li key={event.type} className="relative flex gap-3 pb-6 last:pb-0">
          {!isLast && <span aria-hidden className={`absolute left-[5px] top-4 h-full w-px ${state === "complete" ? "bg-success" : "bg-line"}`} />}
          <span aria-hidden className={`relative z-10 mt-1.5 size-3 shrink-0 rounded-full ${state === "complete" ? "bg-success" : state === "current" ? "bg-brand" : "bg-line"}`} />
          <div>
            <strong className="block">{labels[event.type as keyof typeof labels]}</strong>
            <span className="text-sm text-muted">{event.occurredAt ? new Date(event.occurredAt).toLocaleString("id-ID") : state === "current" ? "Sedang menunggu langkah ini" : "Menunggu langkah sebelumnya"}</span>
          </div>
        </li>;
      })}</ol>
    </Card>
  </div></AppShell></AuthGuard>;
}

function AnchorStatus({ anchor }: { anchor: NonNullable<TransferDetail["anchor"]> }) {
  const { title, detail, tone } = anchorPresentation(anchor);
  return <Card className={`mt-6 border ${tone === "error" ? "border-danger bg-danger-wash" : "border-peach bg-peach-wash"}`}>
    <div role="status" aria-live="polite" aria-label="Status pencairan">
      <p className="text-xs font-extrabold tracking-[.15em] text-brand-deep">STATUS PENCAIRAN</p>
      <h2 className="mt-2 text-xl font-extrabold">{title}</h2>
      <p className="mt-1 text-sm text-muted">{detail}</p>
      <p className="mt-4 rounded-xl bg-white/70 px-3 py-2 text-xs font-semibold text-muted">Nomor referensi: {anchor.txId}</p>
    </div>
  </Card>;
}

function anchorPresentation(anchor: NonNullable<TransferDetail["anchor"]>) {
  if (anchor.status === "completed") return { title: "Pencairan selesai", detail: "Mitra pencairan sudah mengonfirmasi uang diterima penerima.", tone: "success" };
  if (["error", "refunded", "expired", "no_market"].includes(anchor.status ?? "")) return { title: "Pencairan memerlukan perhatian", detail: "Pencairan belum dapat diselesaikan. Simpan nomor referensi di bawah untuk tindak lanjut.", tone: "error" };
  if (anchor.paymentTxHash) return { title: "Pembayaran terkirim", detail: "Sangu sudah mengirim pembayaran dan menunggu konfirmasi akhir.", tone: "pending" };
  if (anchor.status === "pending_user_transfer_start") return { title: "Siap dibayarkan", detail: "Penerima sudah menyelesaikan verifikasi. Sangu akan membayar otomatis.", tone: "pending" };
  return { title: "Menunggu verifikasi penerima", detail: "Penerima perlu menyelesaikan langkah verifikasi sebelum pembayaran dilanjutkan.", tone: "pending" };
}
