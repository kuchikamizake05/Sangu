import { fireEvent, render, screen } from "@testing-library/react";
import { getRecurring, setRecurringStatus } from "@/lib/api";
import { RecurringManager } from "./recurring-manager";

vi.mock("@/lib/api", () => ({ getRecurring: vi.fn(), setRecurringStatus: vi.fn(), deleteRecurring: vi.fn(), updateRecurring: vi.fn() }));

describe("RecurringManager", () => {
  it("lists active schedules and pauses one after confirmation", async () => {
    vi.mocked(getRecurring).mockResolvedValue([{ recurringId: "monthly-1", recipientMasked: "+62812•••00", corridor: "MY", amountForeign: "500", dayOfMonth: 15, status: "ACTIVE", nextRunAt: "2026-08-15T00:00:00.000Z" }]);
    vi.mocked(setRecurringStatus).mockResolvedValue({ recurringId: "monthly-1", status: "PAUSED" });
    render(<RecurringManager />);

    expect(await screen.findByText("+62812•••00")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Jeda jadwal" }));
    expect(screen.getByRole("dialog", { name: "Jeda jadwal ini?" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Konfirmasi jeda" }));
    expect(await screen.findByText("Dijeda")).toBeInTheDocument();
    expect(setRecurringStatus).toHaveBeenCalledWith("monthly-1", "pause");
  });

  it("separates active schedules from paused schedules", async () => {
    vi.mocked(getRecurring).mockResolvedValue([
      { recurringId: "active", recipientMasked: "+62812••••00", corridor: "MY", amountForeign: "500", dayOfMonth: 15, status: "ACTIVE", nextRunAt: "2026-08-15T00:00:00.000Z" },
      { recurringId: "paused", recipientMasked: "+62813••••00", corridor: "HK", amountForeign: "800", dayOfMonth: 20, status: "PAUSED", nextRunAt: "2026-08-20T00:00:00.000Z" },
    ]);
    render(<RecurringManager />);

    expect(await screen.findByRole("heading", { name: "Jadwal aktif" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Jadwal dijeda" })).toBeInTheDocument();
  });

  it("moves focus into the confirmation dialog and restores it after Escape", async () => {
    vi.mocked(getRecurring).mockResolvedValue([{ recurringId: "monthly-1", recipientMasked: "+62812••••00", corridor: "MY", amountForeign: "500", dayOfMonth: 15, status: "ACTIVE", nextRunAt: "2026-08-15T00:00:00.000Z" }]);
    render(<RecurringManager />);

    const trigger = await screen.findByRole("button", { name: "Jeda jadwal" });
    trigger.focus();
    fireEvent.click(trigger);
    expect(screen.getByRole("button", { name: "Batal" })).toHaveFocus();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
});
