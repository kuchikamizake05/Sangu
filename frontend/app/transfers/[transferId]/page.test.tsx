import { act, render, screen } from "@testing-library/react";
import { getTransferDetail } from "@/lib/api";
import TransferDetailPage from "./page";

vi.mock("@/lib/api", () => ({ getTransferDetail: vi.fn(), getMe: vi.fn().mockResolvedValue({ senderId: "s1", name: "Test", phoneMasked: "+628•••00", hasPasskey: true, walletAddress: null }) }));

describe("TransferDetailPage", () => {
  beforeEach(() => {
    window.localStorage.setItem("sangu.token", "test-token");
  });

  it("shows the selected transfer and its backend event timeline", async () => {
    vi.mocked(getTransferDetail).mockResolvedValue({ transferId: "transfer-1", status: "PAID_OUT", amount: "500", corridor: "MY", amountIdr: "1750000", recipientMasked: "+62812••••", createdAt: "2026-07-13T09:00:00.000Z", events: [{ type: "CREATED", occurredAt: "2026-07-13T09:00:00.000Z" }, { type: "DEPOSITED", occurredAt: "2026-07-13T09:01:00.000Z" }, { type: "PAID_OUT", occurredAt: "2026-07-13T09:05:00.000Z" }] });
    await act(async () => { render(<TransferDetailPage params={Promise.resolve({ transferId: "transfer-1" })} />); });
    expect(await screen.findByText("DETAIL TRANSFER")).toBeInTheDocument();
    expect(screen.getByText("Uang kamu diamankan")).toBeInTheDocument();
    expect(screen.getByText("Dana dicairkan")).toBeInTheDocument();
  });

  it("shows a live SEP-24 anchor status and refreshes it while pending", async () => {
    vi.mocked(getTransferDetail).mockResolvedValue({ transferId: "transfer-anchor", status: "PAID_OUT", amount: "500", corridor: "MY", amountIdr: "1750000", recipientMasked: "+62812••••", createdAt: "2026-07-13T09:00:00.000Z", events: [{ type: "CREATED", occurredAt: "2026-07-13T09:00:00.000Z" }, { type: "PAID_OUT", occurredAt: "2026-07-13T09:05:00.000Z" }], anchor: { txId: "anchor-1", status: "pending_user_transfer_start", paymentTxHash: null, interactiveUrl: "https://anchor.example/interactive/withdrawal-1" } });
    await act(async () => { render(<TransferDetailPage params={Promise.resolve({ transferId: "transfer-anchor" })} />); });

    expect(await screen.findByRole("status", { name: "Status pencairan" })).toHaveTextContent("Siap dibayarkan");
    expect(screen.getByText("Nomor referensi: anchor-1")).toBeInTheDocument();

    vi.useFakeTimers();
    await act(async () => { await vi.advanceTimersByTimeAsync(10_000); });
    expect(getTransferDetail).toHaveBeenCalledTimes(2);
  });
});
