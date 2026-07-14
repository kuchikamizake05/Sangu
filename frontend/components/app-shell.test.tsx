import { render, screen, within } from "@testing-library/react";
import { usePathname } from "next/navigation";
import { beforeEach, vi } from "vitest";
import { AppShell } from "./app-shell";

vi.mock("next/navigation", () => ({ usePathname: vi.fn() }));

function getTabBar() {
  return screen.getByRole("navigation", { name: "Navigasi aplikasi" });
}

function getSidebar() {
  return screen.getByRole("navigation", { name: "Navigasi aplikasi (desktop)" });
}

describe("AppShell", () => {
  beforeEach(() => { vi.mocked(usePathname).mockReturnValue("/app"); });

  it("renders app chrome while authentication is handled by AuthGuard", () => {
    render(<AppShell>Isi halaman</AppShell>);
    expect(screen.getByText("Isi halaman")).toBeInTheDocument();
  });

  it("provides app navigation on the tab bar for the sender surface", () => {
    render(<AppShell>Isi halaman</AppShell>);

    const tabBar = within(getTabBar());
    expect(tabBar.getByRole("link", { name: "Beranda" })).toBeInTheDocument();
    expect(tabBar.getByRole("link", { name: "Aktivitas" })).toBeInTheDocument();
    expect(tabBar.getByRole("link", { name: "Bulanan" })).toBeInTheDocument();
    expect(tabBar.getByRole("link", { name: "Akun" })).toBeInTheDocument();
  });

  it("provides the same navigation plus a send shortcut on the desktop sidebar", () => {
    render(<AppShell>Isi halaman</AppShell>);

    const sidebar = within(getSidebar());
    expect(sidebar.getByRole("link", { name: "Beranda" })).toBeInTheDocument();
    expect(sidebar.getByRole("link", { name: "Aktivitas" })).toBeInTheDocument();
    expect(sidebar.getByRole("link", { name: "Bulanan" })).toBeInTheDocument();
    expect(sidebar.getByRole("link", { name: "Akun" })).toBeInTheDocument();
    expect(sidebar.getByRole("link", { name: "Kirim" })).toHaveAttribute("href", "/send");
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

  it("marks the matching navigation link as the current page in both navs", () => {
    vi.mocked(usePathname).mockReturnValue("/transfers/transfer-123");

    render(<AppShell>Riwayat</AppShell>);

    for (const nav of [within(getTabBar()), within(getSidebar())]) {
      expect(nav.getByRole("link", { name: "Aktivitas", current: "page" })).toBeInTheDocument();
      expect(nav.getByRole("link", { name: "Beranda", current: false })).toBeInTheDocument();
    }
  });
});
