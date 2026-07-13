import { render, screen } from "@testing-library/react";
import { usePathname, useRouter } from "next/navigation";
import SenderPage from "./page";
import { getAuthToken } from "@/lib/auth-session";

vi.mock("next/navigation", () => ({ usePathname: vi.fn(), useRouter: vi.fn() }));
vi.mock("@/lib/auth-session", () => ({ getAuthToken: vi.fn() }));

describe("SenderPage", () => {
  const replace = vi.fn();
  beforeEach(() => { replace.mockReset(); vi.mocked(usePathname).mockReturnValue("/app"); vi.mocked(useRouter).mockReturnValue({ replace } as never); });

  it("sends unauthenticated visitors to login before rendering the app", () => {
    vi.mocked(getAuthToken).mockReturnValue(null);
    render(<SenderPage />);

    expect(replace).toHaveBeenCalledWith("/login?next=%2Fapp");
    expect(screen.queryByText("Saldo tersedia")).not.toBeInTheDocument();
  });

  it("keeps the dashboard focused for an authenticated sender", () => {
    vi.mocked(getAuthToken).mockReturnValue("sender-session");
    render(<SenderPage />);

    expect(screen.getByText("Saldo tersedia")).toBeInTheDocument();
    expect(screen.getByText("Kiriman terbaru")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Lihat semua riwayat" })).toHaveAttribute("href", "/transfers");
    expect(screen.getAllByRole("link", { name: "Kirim uang" }).every((link) => link.getAttribute("href") === "/send")).toBe(true);
    expect(screen.queryByRole("button", { name: "Kirim uang" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Langkah 1 dari 4" })).not.toBeInTheDocument();
  });
});
