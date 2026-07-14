import { StatusBadge } from "@/components/ui/status-badge";
import { UserIcon } from "@/components/ui/icons";
import type { TransferSummary } from "@/lib/api";
import { formatForeignAmount } from "@/lib/send-flow";

const relativeFormatter = new Intl.RelativeTimeFormat("id", { numeric: "auto" });

function relativeDate(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return "";
  const diffMs = date.getTime() - Date.now();
  const diffMinutes = Math.round(diffMs / 60000);
  const diffHours = Math.round(diffMinutes / 60);
  const diffDays = Math.round(diffHours / 24);

  if (Math.abs(diffMinutes) < 1) return "Baru saja";
  if (Math.abs(diffMinutes) < 60) return relativeFormatter.format(diffMinutes, "minute");
  if (Math.abs(diffHours) < 24) return relativeFormatter.format(diffHours, "hour");
  if (Math.abs(diffDays) < 30) return relativeFormatter.format(diffDays, "day");
  return date.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

// Inisial hanya bermakna kalau penerima punya nama; untuk nomor HP tampilkan ikon orang.
function initialFor(recipientMasked: string): string | null {
  const firstLetter = recipientMasked.trim().match(/[A-Za-z]/);
  return firstLetter ? firstLetter[0].toUpperCase() : null;
}

export function TransferList({
  transfers,
  limit,
  emptyLabel = "Belum ada kiriman. Mulai kirim ke keluarga di rumah.",
}: {
  transfers: TransferSummary[];
  limit?: number;
  emptyLabel?: string;
}) {
  const items = typeof limit === "number" ? transfers.slice(0, limit) : transfers;

  if (items.length === 0) {
    return <p className="py-4 text-sm text-muted">{emptyLabel}</p>;
  }

  return (
    <div className="divide-y divide-line">
      {items.map((transfer) => (
        <a
          key={transfer.transferId}
          href={`/transfers/${transfer.transferId}`}
          className="flex min-h-14 items-center justify-between gap-3 py-3 no-underline hover:opacity-80"
        >
          <span className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-canvas text-sm font-bold text-ink">
              {initialFor(transfer.recipientMasked) ?? <UserIcon aria-hidden="true" className="size-5 text-muted" />}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-ink">{transfer.recipientMasked}</span>
              <span className="block text-xs text-muted">{relativeDate(transfer.createdAt)}</span>
            </span>
          </span>
          <span className="flex shrink-0 flex-col items-end gap-1">
            <span className="tabular-nums text-sm font-bold text-ink">
              {formatForeignAmount(transfer.amount, transfer.corridor)}
            </span>
            <StatusBadge status={transfer.status} />
          </span>
        </a>
      ))}
    </div>
  );
}
