import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SenderPage from "./page";

vi.mock("@/lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api")>()),
  getMe: vi.fn().mockResolvedValue({ senderId: "s1", name: "Siti Aminah", phoneMasked: "+628•••00", hasPasskey: true, walletAddress: null }),
  getWalletBalance: vi.fn().mockResolvedValue({ currency: "MYR", amount: "1840", idrEstimate: "6750000", source: "demo" }),
  getTransfers: vi.fn().mockResolvedValue([]),
  getRecurring: vi.fn().mockResolvedValue([]),
  topupWallet: vi.fn().mockResolvedValue({ currency: "MYR", amount: "1940", idrEstimate: "7100000", source: "demo" }),
  markRecurringSent: vi.fn().mockResolvedValue({ recurringId: "r1", dueNow: false }),
}));

import { getRecurring, getTransfers } from "@/lib/api";

describe("SenderPage", () => {
  beforeEach(() => {
    window.localStorage.setItem("sangu.token", "test-token");
    window.localStorage.setItem(
      "sangu.sender",
      JSON.stringify({ senderId: "s1", name: "Siti Aminah", phoneMasked: "+628•••00", hasPasskey: true, walletAddress: null }),
    );
  });

  it("shows a focused dashboard with greeting, hero balance, and single primary CTA to /send", async () => {
    render(<SenderPage />);

    expect(await screen.findByText("Halo, Siti")).toBeInTheDocument();
    expect(screen.getByText("Saldo kamu")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("RM 1.840,00")).toBeInTheDocument());
    expect(screen.getByText("demo")).toBeInTheDocument();

    const sendLinks = screen.getAllByRole("link", { name: "Kirim uang" });
    expect(sendLinks).toHaveLength(1);
    expect(sendLinks[0]).toHaveAttribute("href", "/send");

    expect(screen.getByText("Terakhir dikirim")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Lihat semua" })).toHaveAttribute("href", "/transfers");
    expect(screen.getByText("Belum ada kiriman. Mulai kirim ke keluarga di rumah.")).toBeInTheDocument();
  });

  it("shows the Sangu Bulanan banner only when a schedule is due now", async () => {
    vi.mocked(getRecurring).mockResolvedValueOnce([
      {
        recurringId: "r1",
        recipientMasked: "+628•••99",
        corridor: "MY",
        amountForeign: "500",
        dayOfMonth: 1,
        status: "ACTIVE",
        nextRunAt: new Date().toISOString(),
        recipientPhone: "+6281200000099",
        dueNow: true,
      },
    ]);

    render(<SenderPage />);

    expect(await screen.findByText(/Sangu Bulanan siap dikirim/)).toBeInTheDocument();
    const cta = screen.getByRole("link", { name: "Kirim sekarang" });
    expect(cta.getAttribute("href")).toContain("/send?recipient=");
    expect(cta.getAttribute("href")).toContain("recurringId=r1");
    expect(screen.getByRole("button", { name: "Nanti dulu" })).toBeInTheDocument();
  });

  it("renders recent transfers with a link to the full history", async () => {
    vi.mocked(getTransfers).mockResolvedValueOnce([
      { transferId: "t1", status: "PAID_OUT", amount: "500", corridor: "MY", recipientMasked: "Ibu•••", createdAt: new Date().toISOString() },
    ]);

    render(<SenderPage />);

    expect(await screen.findByText("Ibu•••")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Lihat semua" })).toHaveAttribute("href", "/transfers");
  });
});
