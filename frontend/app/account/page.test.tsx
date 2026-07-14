import { render, screen } from "@testing-library/react";
import AccountPage from "./page";
import { getMe } from "@/lib/api";

vi.mock("@/components/app-shell", () => ({ AppShell: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock("@/components/auth-guard", () => ({ AuthGuard: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock("@/lib/api", () => ({ getMe: vi.fn() }));

describe("AccountPage", () => {
  it("shows sender details without exposing wallet terminology", async () => {
    vi.mocked(getMe).mockResolvedValue({ senderId: "sender-1", name: "Ayu", phoneMasked: "+62812••••", hasPasskey: true, walletAddress: "C-hidden" });
    render(<AccountPage />);
    expect(await screen.findByText("Ayu")).toBeInTheDocument();
    expect(screen.getByText("+62812••••")).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/wallet|address|XDR|seed phrase/i);
  });
});
