export type TransferStatus = "PENDING" | "CLAIMED" | "PAID_OUT" | "REFUNDED" | "EXPIRED";
export type TransferFilter = "ALL" | TransferStatus;
export type TimelineState = "complete" | "current" | "upcoming";
export type TimelineEvent = { label: string; state: TimelineState; at?: string };

type TransferLike = { status: TransferStatus };

export function filterTransfers<T extends TransferLike>(transfers: readonly T[], filter: TransferFilter) {
  return filter === "ALL" ? [...transfers] : transfers.filter((transfer) => transfer.status === filter);
}

export function timelineFor(status: TransferStatus, createdAt: string): TimelineEvent[] {
  const created: TimelineEvent = { label: "Transfer dibuat", state: "complete", at: createdAt };
  const claimed: TimelineEvent = { label: "Penerima claim", state: "upcoming" };
  const paid: TimelineEvent = { label: "Dana dicairkan", state: "upcoming" };

  if (status === "PENDING") return [created, { label: "Menunggu penerima claim", state: "current" }, paid];
  if (status === "CLAIMED") return [created, { ...claimed, state: "complete" }, { label: "Pencairan diproses", state: "current" }, paid];
  if (status === "PAID_OUT") return [created, { ...claimed, state: "complete" }, { ...paid, state: "complete" }];
  if (status === "REFUNDED") return [created, { label: "Masa claim berakhir", state: "complete" }, { label: "Dana dikembalikan", state: "complete" }];
  return [created, { label: "Transfer kedaluwarsa", state: "current" }, { label: "Dana akan dikembalikan", state: "upcoming" }];
}
