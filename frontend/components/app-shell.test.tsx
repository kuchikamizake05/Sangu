import { render, screen } from "@testing-library/react";
import { usePathname } from "next/navigation";
import { beforeEach, vi } from "vitest";
import { AppShell } from "./app-shell";
import { getAuthToken } from "@/lib/auth-session";

vi.mock("next/navigation", () => ({ usePathname: vi.fn() }));
vi.mock("@/lib/auth-session", () => ({ getAuthToken: vi.fn() }));

describe("AppShell", () => {
  beforeEach(() => { vi.mocked(usePathname).mockReturnValue("/app"); vi.mocked(getAuthToken).mockReturnValue("session"); });

  it("redirects a visitor without a session to login, while claim remains public", () => {
    vi.mocked(getAuthToken).mockReturnValue(null);
    render(<AppShell>Isi halaman</AppShell>);
    expect(screen.queryByText("Isi halaman")).not.toBeInTheDocument();
  });

  it("provides app navigation for desktop and mobile sender surfaces", () => {
    render(<AppShell>Isi halaman</AppShell>);

    expect(screen.getAllByRole("link", { name: "Beranda" })).toHaveLength(2);
    expect(screen.getAllByRole("link", { name: "Riwayat" })).toHaveLength(2);
    expect(screen.getAllByRole("link", { name: "Sangu Bulanan" })).toHaveLength(2);
    expect(screen.getAllByRole("link", { name: "Akun" })).toHaveLength(2);
    expect(screen.getByRole("link", { name: "Kirim uang" })).toHaveAttribute("href", "/send");
  });

  it("keeps the claim surface free of sender-only context", () => {
    render(<AppShell mode="claim">Claim</AppShell>);

    expect(screen.queryByRole("link", { name: "Riwayat" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Kirim uang" })).not.toBeInTheDocument();
  });

  it("marks the matching desktop and mobile navigation links as the current page", () => {
    vi.mocked(usePathname).mockReturnValue("/transfers/transfer-123");

    render(<AppShell>Riwayat</AppShell>);

    expect(screen.getAllByRole("link", { name: "Riwayat", current: "page" })).toHaveLength(2);
    expect(screen.getAllByRole("link", { name: "Beranda", current: false })).toHaveLength(2);
  });
});
