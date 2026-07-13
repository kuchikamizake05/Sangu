import { filterTransfers, timelineFor } from "./transfer-history-presentation";

const transfers = [
  { transferId: "pending", status: "PENDING", amount: "500", recipientMasked: "+62812••••", createdAt: "2026-07-13T08:00:00.000Z" },
  { transferId: "paid", status: "PAID_OUT", amount: "500", recipientMasked: "+62813••••", createdAt: "2026-07-13T09:00:00.000Z" },
] as const;

describe("transfer history presentation", () => {
  it("filters only the requested transfer status", () => {
    expect(filterTransfers(transfers, "PAID_OUT")).toEqual([transfers[1]]);
    expect(filterTransfers(transfers, "ALL")).toEqual(transfers);
  });

  it("marks the final payout event as complete for a paid transfer", () => {
    expect(timelineFor("PAID_OUT", "2026-07-13T09:00:00.000Z")).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: "Transfer dibuat", state: "complete" }),
      expect.objectContaining({ label: "Dana dicairkan", state: "complete" }),
    ]));
  });

  it("marks the next pending action without claiming it has completed", () => {
    expect(timelineFor("PENDING", "2026-07-13T08:00:00.000Z")).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: "Menunggu penerima claim", state: "current" }),
      expect.objectContaining({ label: "Dana dicairkan", state: "upcoming" }),
    ]));
  });
});
