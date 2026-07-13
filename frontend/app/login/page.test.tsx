import { fireEvent, render, screen } from "@testing-library/react";
import LoginPage from "./page";
import { requestAuthOtp, verifyAuthOtp } from "@/lib/api";

vi.mock("@/lib/api", () => ({ requestAuthOtp: vi.fn(), verifyAuthOtp: vi.fn() }));

describe("LoginPage", () => {
  it("lets a sender request and verify an OTP without crypto terminology", async () => {
    vi.mocked(requestAuthOtp).mockResolvedValue({ sent: true });
    vi.mocked(verifyAuthOtp).mockResolvedValue({ token: "session-1", sender: { senderId: "sender-1", name: "Ayu", phoneMasked: "+62812••••", hasPasskey: false } });
    render(<LoginPage />);

    fireEvent.change(screen.getByRole("textbox", { name: "Nomor WhatsApp" }), { target: { value: "+6281234567890" } });
    fireEvent.click(screen.getByRole("button", { name: "Kirim kode" }));
    expect(await screen.findByRole("textbox", { name: "Kode OTP" })).toBeInTheDocument();
    fireEvent.change(screen.getByRole("textbox", { name: "Kode OTP" }), { target: { value: "000000" } });
    fireEvent.click(screen.getByRole("button", { name: "Verifikasi dan lanjutkan" }));
    expect(await screen.findByText("Halo, Ayu")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Lanjut ke Beranda" })).toHaveAttribute("href", "/app");
    expect(document.body.textContent).not.toMatch(/wallet|address|XDR|seed phrase/i);
  });

  it("asks for a name only when the verified phone is new", async () => {
    vi.mocked(requestAuthOtp).mockResolvedValue({ sent: true });
    vi.mocked(verifyAuthOtp).mockRejectedValueOnce(new Error("Nama lengkap diperlukan untuk membuat akun.")).mockResolvedValueOnce({ token: "session-1", sender: { senderId: "sender-1", name: "Ayu", phoneMasked: "+62812••••", hasPasskey: false } });
    render(<LoginPage />);
    fireEvent.change(screen.getByRole("textbox", { name: "Nomor WhatsApp" }), { target: { value: "+6281234567890" } });
    fireEvent.click(screen.getByRole("button", { name: "Kirim kode" }));
    await screen.findByRole("textbox", { name: "Kode OTP" });
    expect(screen.queryByRole("textbox", { name: "Nama lengkap" })).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole("textbox", { name: "Kode OTP" }), { target: { value: "000000" } });
    fireEvent.click(screen.getByRole("button", { name: "Verifikasi dan lanjutkan" }));
    expect(await screen.findByRole("textbox", { name: "Nama lengkap" })).toBeInTheDocument();
  });
});
