import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, getPasskeyLoginOptions, requestAuthOtp, verifyAuthOtp } from "@/lib/api";
import { loginWithPasskey } from "@/lib/passkey-wallet";
import LoginPage from "./page";

vi.mock("next/navigation", () => ({ usePathname: vi.fn().mockReturnValue("/login") }));

vi.mock("@/lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api")>()),
  getPasskeyLoginOptions: vi.fn(),
  requestAuthOtp: vi.fn(),
  verifyAuthOtp: vi.fn(),
}));

vi.mock("@/lib/passkey-wallet", () => ({
  loginWithPasskey: vi.fn(),
  registerPasskeyAndWallet: vi.fn(),
}));

describe("LoginPage", () => {
  beforeEach(() => {
    window.localStorage.clear();
    const assign = vi.fn();
    Object.defineProperty(window, "location", { value: { pathname: "/login", search: "", assign }, writable: true });
  });

  it("falls back to the OTP flow when the account has no passkey yet, then signs in", async () => {
    vi.mocked(getPasskeyLoginOptions).mockRejectedValue(new ApiError("akun tidak ditemukan", "SENDER_NOT_FOUND"));
    vi.mocked(requestAuthOtp).mockResolvedValue({ sent: true });
    vi.mocked(verifyAuthOtp).mockResolvedValue({
      token: "jwt-token",
      sender: { senderId: "s1", name: "Budi", phoneMasked: "+628•••00", hasPasskey: true },
    });

    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText("Nomor HP"), { target: { value: "+628120000000" } });
    fireEvent.click(screen.getByRole("button", { name: "Lanjutkan" }));

    expect(await screen.findByText("Masukkan kode OTP")).toBeInTheDocument();
    expect(requestAuthOtp).toHaveBeenCalledWith("+628120000000");

    fireEvent.change(screen.getByLabelText("Digit 1"), { target: { value: "123456" } });
    fireEvent.click(screen.getByRole("button", { name: "Verifikasi & masuk" }));

    await vi.waitFor(() => expect(verifyAuthOtp).toHaveBeenCalledWith("+628120000000", "123456", undefined));
    await vi.waitFor(() => expect(window.localStorage.getItem("sangu.token")).toBe("jwt-token"));
    expect(window.location.assign).toHaveBeenCalledWith("/app");
  });

  it("shows an inline error and offers SMS fallback when passkey login fails for another reason", async () => {
    vi.mocked(getPasskeyLoginOptions).mockResolvedValue({} as never);
    vi.mocked(loginWithPasskey).mockRejectedValue(new Error("dibatalkan pengguna"));

    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText("Nomor HP"), { target: { value: "+628120000000" } });
    fireEvent.click(screen.getByRole("button", { name: "Lanjutkan" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("dibatalkan pengguna");
    expect(await screen.findByRole("button", { name: "Masuk dengan kode SMS" })).toBeInTheDocument();
  });

  it("combines the selected country code with a local number before requesting OTP", async () => {
    vi.mocked(getPasskeyLoginOptions).mockRejectedValue(new ApiError("akun tidak ditemukan", "SENDER_NOT_FOUND"));
    vi.mocked(requestAuthOtp).mockResolvedValue({ sent: true });

    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText("Kode negara"), { target: { value: "MY" } });
    fireEvent.change(screen.getByLabelText("Nomor HP"), { target: { value: "012 345 6789" } });
    fireEvent.click(screen.getByRole("button", { name: "Lanjutkan" }));

    await vi.waitFor(() => expect(requestAuthOtp).toHaveBeenCalledWith("+60123456789"));
  });

  it("recognizes a pasted supported international number and updates its country selection", () => {
    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText("Nomor HP"), { target: { value: "+852 1234 5678" } });

    expect(screen.getByLabelText("Kode negara")).toHaveValue("HK");
    expect(screen.getByLabelText("Nomor HP")).toHaveValue("1234 - 567 - 8");
  });

  it("shows an inline validity check once the local number is complete", () => {
    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText("Kode negara"), { target: { value: "MY" } });
    fireEvent.change(screen.getByLabelText("Nomor HP"), { target: { value: "0123456789" } });

    expect(screen.getByLabelText("Nomor HP valid")).toBeInTheDocument();
  });
});
