import { fireEvent, render, screen } from "@testing-library/react";
import { TransferHub } from "./transfer-hub";
import { createRecurring, getTransfers } from "@/lib/api";

vi.mock("@/lib/api", () => ({ getTransfers: vi.fn(), createRecurring: vi.fn() }));

describe("TransferHub", () => {
  it("offers the first-transfer action when history is empty", async () => {
    vi.mocked(getTransfers).mockResolvedValue([]);
    const onStartTransfer = vi.fn();
    render(<TransferHub onStartTransfer={onStartTransfer} />);

    fireEvent.click(await screen.findByRole("button", { name: "Kirim uang pertama" }));
    expect(onStartTransfer).toHaveBeenCalledOnce();
  });

  it("links a transfer to its dedicated detail route", async () => {
    vi.mocked(getTransfers).mockResolvedValue([{ transferId: "transfer-1", status: "PAID_OUT", amount: "1720000", recipientMasked: "+62812••••", createdAt: "2026-07-12T10:00:00.000Z" }]);
    render(<TransferHub onStartTransfer={vi.fn()} />);

    expect(await screen.findByRole("link", { name: /Rp 1.720.000/ })).toHaveAttribute("href", "/transfers/transfer-1");
  });

  it("filters history by status", async () => {
    vi.mocked(getTransfers).mockResolvedValue([
      { transferId: "pending", status: "PENDING", amount: "500", recipientMasked: "+62812••••", createdAt: "2026-07-12T10:00:00.000Z" },
      { transferId: "paid", status: "PAID_OUT", amount: "700", recipientMasked: "+62813••••", createdAt: "2026-07-12T11:00:00.000Z" },
    ]);
    render(<TransferHub onStartTransfer={vi.fn()} showRecurring={false} />);

    fireEvent.click(await screen.findByRole("button", { name: "Selesai" }));
    expect(screen.getByText("Rp 700")).toBeInTheDocument();
    expect(screen.queryByText("Rp 500")).not.toBeInTheDocument();
  });

  it("uses a compact status dropdown on mobile while retaining the desktop filters", async () => {
    vi.mocked(getTransfers).mockResolvedValue([
      { transferId: "pending", status: "PENDING", amount: "500", recipientMasked: "+62812â€¢â€¢â€¢â€¢", createdAt: "2026-07-12T10:00:00.000Z" },
      { transferId: "paid", status: "PAID_OUT", amount: "700", recipientMasked: "+62813â€¢â€¢â€¢â€¢", createdAt: "2026-07-12T11:00:00.000Z" },
    ]);
    render(<TransferHub onStartTransfer={vi.fn()} showRecurring={false} />);

    const filter = await screen.findByRole("combobox", { name: "Filter status" });
    fireEvent.change(filter, { target: { value: "PAID_OUT" } });
    expect(screen.getByText("Rp 700")).toBeInTheDocument();
    expect(screen.queryByText("Rp 500")).not.toBeInTheDocument();
  });

  it("puts transfers that still need attention before completed history", async () => {
    vi.mocked(getTransfers).mockResolvedValue([
      { transferId: "paid", status: "PAID_OUT", amount: "700", recipientMasked: "+62813••••", createdAt: "2026-07-12T11:00:00.000Z" },
      { transferId: "pending", status: "PENDING", amount: "500", recipientMasked: "+62812••••", createdAt: "2026-07-12T10:00:00.000Z" },
    ]);
    render(<TransferHub onStartTransfer={vi.fn()} showRecurring={false} />);

    expect(await screen.findByRole("heading", { name: "Kiriman aktif" })).toBeInTheDocument();
    expect(screen.getByText("Rp 500").compareDocumentPosition(screen.getByText("Rp 700")) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("limits the dashboard history preview and links to the full history", async () => {
    vi.mocked(getTransfers).mockResolvedValue([
      { transferId: "paid", status: "PAID_OUT", amount: "700", recipientMasked: "+62813â€¢â€¢â€¢â€¢", createdAt: "2026-07-12T11:00:00.000Z" },
      { transferId: "pending", status: "PENDING", amount: "500", recipientMasked: "+62812â€¢â€¢â€¢â€¢", createdAt: "2026-07-12T10:00:00.000Z" },
      { transferId: "claimed", status: "CLAIMED", amount: "900", recipientMasked: "+62814â€¢â€¢â€¢â€¢", createdAt: "2026-07-12T12:00:00.000Z" },
    ]);
    render(<TransferHub onStartTransfer={vi.fn()} showRecurring={false} historyMode="preview" viewHistoryHref="/transfers" />);

    expect(await screen.findByText("Kiriman terbaru")).toBeInTheDocument();
    expect(screen.getByText("Rp 500")).toBeInTheDocument();
    expect(screen.getByText("Rp 900")).toBeInTheDocument();
    expect(screen.queryByText("Rp 700")).not.toBeInTheDocument();
    expect(screen.queryByRole("combobox", { name: "Filter status" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Lihat semua riwayat" })).toHaveAttribute("href", "/transfers");
  });

  it("saves a recurring schedule", async () => {
    vi.mocked(getTransfers).mockResolvedValue([]);
    vi.mocked(createRecurring).mockResolvedValue({ recurringId: "monthly-1" });
    render(<TransferHub onStartTransfer={vi.fn()} />);

    fireEvent.click(await screen.findByRole("button", { name: "Atur" }));
    fireEvent.click(screen.getByRole("button", { name: "Simpan jadwal" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Sangu Bulanan aktif · ID monthly-1");
    expect(createRecurring).toHaveBeenCalledWith(expect.objectContaining({ dayOfMonth: 1, corridor: "MY" }));
  });

  it("can render the recurring surface without embedding transfer history", () => {
    vi.mocked(getTransfers).mockResolvedValue([]);
    render(<TransferHub onStartTransfer={vi.fn()} showHistory={false} />);

    expect(screen.queryByText("Riwayat kiriman")).not.toBeInTheDocument();
    expect(screen.getByText("Sangu Bulanan")).toBeInTheDocument();
  });
});
