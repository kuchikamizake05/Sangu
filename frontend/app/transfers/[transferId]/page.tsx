"use client";

import { use, useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { AuthGuard } from "@/components/auth-guard";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { getTransferDetail, type TransferDetail } from "@/lib/api";
import { useIntlLocale, useT } from "@/lib/i18n/locale-context";

const stages = ["CREATED", "DEPOSITED", "CLAIMED", "PAID_OUT"] as const;
const anchorTerminalStatuses = new Set(["completed", "refunded", "expired", "error", "no_market"]);

export default function TransferDetailPage({ params }: { params: Promise<{ transferId: string }> }) {
  const t = useT();
  const intlLocale = useIntlLocale();
  const labels = {
    CREATED: t("transfers.stageCreated"),
    DEPOSITED: t("transfers.stageDeposited"),
    CLAIMED: t("transfers.stageClaimed"),
    PAID_OUT: t("transfers.stagePaidOut"),
    REFUNDED: t("transfers.stageRefunded"),
    EXPIRED: t("transfers.stageExpired"),
  } as const;
  const { transferId } = use(params);
  const [transfer, setTransfer] = useState<TransferDetail | null | undefined>();

  useEffect(() => { getTransferDetail(transferId).then(setTransfer).catch(() => setTransfer(null)); }, [transferId]);

  const shouldPollAnchor = Boolean(transfer?.anchor && !anchorTerminalStatuses.has(transfer.anchor.status ?? ""));
  useEffect(() => {
    if (!shouldPollAnchor) return;
    const interval = window.setInterval(() => { getTransferDetail(transferId).then(setTransfer).catch(() => undefined); }, 10_000);
    return () => window.clearInterval(interval);
  }, [shouldPollAnchor, transferId]);

  if (transfer === undefined) return <AuthGuard><AppShell><Card className="mx-auto max-w-2xl text-muted">{t("transfers.loadingDetail")}</Card></AppShell></AuthGuard>;
  if (!transfer) return <AuthGuard><AppShell><Card className="mx-auto max-w-2xl">{t("transfers.notFound")}</Card></AppShell></AuthGuard>;

  const actual = new Map(transfer.events.map((event) => [event.type, event.occurredAt]));
  const timeline = transfer.status === "REFUNDED" || transfer.status === "EXPIRED" ? [...transfer.events] : stages.map((type) => ({ type, occurredAt: actual.get(type) }));
  const latest = Math.max(0, timeline.reduce((last, event, index) => event.occurredAt ? index : last, 0));

  return <AuthGuard><AppShell><div className="mx-auto max-w-2xl pb-12">
    <a className="text-sm font-semibold text-muted underline" href="/transfers">{t("transfers.backToHistory")}</a>
    <p className="mt-7 text-xs font-extrabold tracking-[.15em] text-brand-deep">{t("transfers.detailEyebrow")}</p>
    <Card className="mt-3">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="tabular-nums text-4xl font-extrabold tracking-[-.06em]">Rp {Number(transfer.amount).toLocaleString(intlLocale)}</h1>
          <p className="mt-2 text-sm text-muted">{t("transfers.toRecipient")} {transfer.recipientMasked}</p>
        </div>
        <StatusBadge status={transfer.status} />
      </div>
    </Card>
    {transfer.anchor && <AnchorStatus anchor={transfer.anchor} />}
    <Card className="mt-6">
      <p className="text-sm font-bold">{t("transfers.journeyTitle")}</p>
      <ol className="mt-6 grid gap-0">{timeline.map((event, index) => {
        const state = event.occurredAt ? "complete" : index === latest + 1 ? "current" : "upcoming";
        const isLast = index === timeline.length - 1;
        return <li key={event.type} className="relative flex gap-3 pb-6 last:pb-0">
          {!isLast && <span aria-hidden className={`absolute left-[5px] top-4 h-full w-px ${state === "complete" ? "bg-success" : "bg-line"}`} />}
          <span aria-hidden className={`relative z-10 mt-1.5 size-3 shrink-0 rounded-full ${state === "complete" ? "bg-success" : state === "current" ? "bg-brand" : "bg-line"}`} />
          <div>
            <strong className="block">{labels[event.type as keyof typeof labels]}</strong>
            <span className="text-sm text-muted">{event.occurredAt ? new Date(event.occurredAt).toLocaleString(intlLocale) : state === "current" ? t("transfers.currentStep") : t("transfers.upcomingStep")}</span>
          </div>
        </li>;
      })}</ol>
    </Card>
  </div></AppShell></AuthGuard>;
}

function AnchorStatus({ anchor }: { anchor: NonNullable<TransferDetail["anchor"]> }) {
  const t = useT();
  const { title, detail, tone } = anchorPresentation(anchor, t);
  return <Card className={`mt-6 border ${tone === "error" ? "border-danger bg-danger-wash" : "border-peach bg-peach-wash"}`}>
    <div role="status" aria-live="polite" aria-label={t("transfers.payoutStatusAria")}>
      <p className="text-xs font-extrabold tracking-[.15em] text-brand-deep">{t("transfers.payoutStatusEyebrow")}</p>
      <h2 className="mt-2 text-xl font-extrabold">{title}</h2>
      <p className="mt-1 text-sm text-muted">{detail}</p>
      <p className="mt-4 rounded-xl bg-white/70 px-3 py-2 text-xs font-semibold text-muted">{t("transfers.refNumber")} {anchor.txId}</p>
    </div>
  </Card>;
}

function anchorPresentation(anchor: NonNullable<TransferDetail["anchor"]>, t: (key: string) => string) {
  if (anchor.status === "completed") return { title: t("transfers.anchorCompletedTitle"), detail: t("transfers.anchorCompletedDetail"), tone: "success" };
  if (["error", "refunded", "expired", "no_market"].includes(anchor.status ?? "")) return { title: t("transfers.anchorAttentionTitle"), detail: t("transfers.anchorAttentionDetail"), tone: "error" };
  if (anchor.paymentTxHash) return { title: t("transfers.anchorSentTitle"), detail: t("transfers.anchorSentDetail"), tone: "pending" };
  if (anchor.status === "pending_user_transfer_start") return { title: t("transfers.anchorReadyTitle"), detail: t("transfers.anchorReadyDetail"), tone: "pending" };
  return { title: t("transfers.anchorWaitingTitle"), detail: t("transfers.anchorWaitingDetail"), tone: "pending" };
}
