import { render, screen } from "@testing-library/react";
import { usePathname } from "next/navigation";
import { beforeEach, vi } from "vitest";
import { AppShell } from "./app-shell";

vi.mock("next/navigation", () => ({ usePathname: vi.fn() }));

describe("AppShell", () => {
  beforeEach(() => vi.mocked(usePathname).mockReturnValue("/app"));

  it("provides app navigation for the sender surface", () => {
    render(<AppShell>Isi halaman</AppShell>);

    expect(screen.getByRole("link", { name: "Beranda" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Aktivitas" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Bulanan" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Akun" })).toBeInTheDocument();
  });

  it("keeps the claim surface free of sender-only context", () => {
    render(<AppShell mode="claim">Claim</AppShell>);

    expect(screen.queryByRole("link", { name: "Aktivitas" })).not.toBeInTheDocument();
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
  });

  it("renders a bare fullscreen wrapper without the tab bar", () => {
    render(<AppShell variant="bare">Bare content</AppShell>);

    expect(screen.getByText("Bare content")).toBeInTheDocument();
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
  });

  it("marks the matching navigation link as the current page", () => {
    vi.mocked(usePathname).mockReturnValue("/transfers/transfer-123");

    render(<AppShell>Riwayat</AppShell>);

    expect(screen.getByRole("link", { name: "Aktivitas", current: "page" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Beranda", current: false })).toBeInTheDocument();
  });
});
