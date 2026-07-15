import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { TransferSummary } from "@/lib/api";
import { LocaleProvider } from "@/lib/i18n/locale-context";
import { LOCALE_STORAGE_KEY } from "@/lib/i18n/config";
import { TransferList } from "./transfer-list";

const NOW = new Date("2026-07-14T12:00:00.000Z").getTime();

function transfer(id: string, createdAt: string): TransferSummary {
  return { transferId: id, recipientMasked: id === "symbol" ? "  •••" : `Ibu ${id}`, amount: "100", corridor: "MY", status: "PENDING", createdAt };
}

describe("TransferList", () => {
  afterEach(() => vi.useRealTimers());

  it("shows a helpful empty state", () => {
    render(<TransferList transfers={[]} emptyLabel="Belum kirim" />);
    expect(screen.getByText("Belum kirim")).toBeInTheDocument();
  });

  it("renders each relative-date path and limits the visible history", () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    render(<TransferList limit={6} transfers={[
      transfer("now", new Date(NOW).toISOString()),
      transfer("minutes", new Date(NOW - 5 * 60_000).toISOString()),
      transfer("hours", new Date(NOW - 2 * 3_600_000).toISOString()),
      transfer("days", new Date(NOW - 3 * 86_400_000).toISOString()),
      transfer("old", new Date(NOW - 60 * 86_400_000).toISOString()),
      transfer("symbol", "not-a-date"),
    ]} />);

    expect(screen.getByRole("link", { name: /Ibu now/i })).toHaveAttribute("href", "/transfers/now");
    expect(screen.getByText("Baru saja")).toBeInTheDocument();
    expect(screen.getByText(/5 menit yang lalu/i)).toBeInTheDocument();
    expect(screen.getByText(/2 jam yang lalu/i)).toBeInTheDocument();
    expect(screen.getByText(/3 hari yang lalu/i)).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /RM\s*100/i })).toHaveLength(6);
  });

  // Regresi: sebelumnya tanggal relatif & badge status hardcoded bahasa Indonesia,
  // sehingga daftar Aktivitas tetap berbahasa Indonesia di mode English.
  it("renders dates and status badges in English when the locale is English", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    window.localStorage.setItem(LOCALE_STORAGE_KEY, "en");
    try {
      render(<LocaleProvider><TransferList transfers={[
        transfer("hours", new Date(NOW - 2 * 3_600_000).toISOString()),
      ]} /></LocaleProvider>);
      // Preferensi locale dibaca dalam useEffect setelah mount.
      await vi.waitFor(() => expect(screen.getByText(/2 hours ago/i)).toBeInTheDocument());
      expect(screen.getByText("Awaiting payout")).toBeInTheDocument();
      expect(screen.queryByText(/jam yang lalu/i)).not.toBeInTheDocument();
    } finally {
      window.localStorage.removeItem(LOCALE_STORAGE_KEY);
    }
  });
});
