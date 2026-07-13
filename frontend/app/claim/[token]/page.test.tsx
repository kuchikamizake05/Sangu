import { act, fireEvent, render, screen } from "@testing-library/react";
import ClaimPage from "./page";
import { getClaim, payout, requestOtp, verifyOtp } from "@/lib/api";

vi.mock("@/lib/api", () => ({
  getClaim: vi.fn(), requestOtp: vi.fn(), verifyOtp: vi.fn(), payout: vi.fn(),
}));

describe("ClaimPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: vi.fn() } });
  });
  afterEach(() => vi.useRealTimers());

  it("requires OTP verification before presenting payout choices", async () => {
    vi.mocked(getClaim).mockResolvedValue({ senderName: "Andi", amountIdr: "1720000", corridor: "MY", status: "PENDING" });
    vi.mocked(requestOtp).mockResolvedValue({ sent: true });
    vi.mocked(verifyOtp).mockResolvedValue({ ok: true, claimSession: "session-1" });
    await act(async () => { render(<ClaimPage params={Promise.resolve({ token: "opaque-token" })} />); });

    fireEvent.click(await screen.findByRole("button", { name: "Cairkan sekarang" }));
    expect(requestOtp).toHaveBeenCalledWith("opaque-token");
    expect(await screen.findByRole("button", { name: "Verifikasi kode" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Cairkan uang" })).not.toBeInTheDocument();

    fireEvent.change(screen.getByRole("textbox", { name: "Kode OTP" }), { target: { value: "123456" } });
    fireEvent.click(screen.getByRole("button", { name: "Verifikasi kode" }));
    expect(await screen.findByRole("button", { name: "Cairkan uang" })).toBeInTheDocument();
    expect(verifyOtp).toHaveBeenCalledWith("opaque-token", "123456");
  });

  it("does not offer OTP or payout for an expired claim link", async () => {
    vi.mocked(getClaim).mockResolvedValue({ senderName: "Andi", amountIdr: "1720000", corridor: "MY", status: "EXPIRED" });
    await act(async () => { render(<ClaimPage params={Promise.resolve({ token: "expired-token" })} />); });

    expect(await screen.findByText("Transfer ini sudah kedaluwarsa.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Cairkan sekarang" })).not.toBeInTheDocument();
    expect(requestOtp).not.toHaveBeenCalled();
  });

  it("locks resend for 60 seconds and announces the remaining time", async () => {
    vi.mocked(getClaim).mockResolvedValue({ senderName: "Andi", amountIdr: "1720000", corridor: "MY", status: "PENDING" });
    vi.mocked(requestOtp).mockResolvedValue({ sent: true });
    await act(async () => { render(<ClaimPage params={Promise.resolve({ token: "opaque-token" })} />); });

    await screen.findByRole("button", { name: "Cairkan sekarang" });
    vi.useFakeTimers();
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Cairkan sekarang" })); });

    expect(screen.getByRole("button", { name: "Kirim ulang dalam 60 dtk" })).toBeDisabled();
    expect(screen.getByRole("status")).toHaveTextContent("Kirim ulang tersedia dalam 60 detik.");

    await act(async () => { await vi.advanceTimersByTimeAsync(60_000); });
    expect(screen.getByRole("button", { name: "Kirim ulang kode" })).toBeEnabled();
  });

  it("keeps the entered OTP visible when verification fails", async () => {
    vi.mocked(getClaim).mockResolvedValue({ senderName: "Andi", amountIdr: "1720000", corridor: "MY", status: "PENDING" });
    vi.mocked(requestOtp).mockResolvedValue({ sent: true });
    vi.mocked(verifyOtp).mockRejectedValue(new Error("Kode OTP tidak cocok."));
    await act(async () => { render(<ClaimPage params={Promise.resolve({ token: "opaque-token" })} />); });

    fireEvent.click(await screen.findByRole("button", { name: "Cairkan sekarang" }));
    const input = await screen.findByRole("textbox", { name: "Kode OTP" });
    fireEvent.change(input, { target: { value: "123456" } });
    fireEvent.click(screen.getByRole("button", { name: "Verifikasi kode" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Kode OTP tidak cocok.");
    expect(input).toHaveValue("123456");
  });

  it("does not verify an OTP that is shorter than six digits", async () => {
    vi.mocked(getClaim).mockResolvedValue({ senderName: "Andi", amountIdr: "1720000", corridor: "MY", status: "PENDING" });
    vi.mocked(requestOtp).mockResolvedValue({ sent: true });
    await act(async () => { render(<ClaimPage params={Promise.resolve({ token: "opaque-token" })} />); });

    fireEvent.click(await screen.findByRole("button", { name: "Cairkan sekarang" }));
    fireEvent.change(await screen.findByRole("textbox", { name: "Kode OTP" }), { target: { value: "12345" } });
    fireEvent.click(screen.getByRole("button", { name: "Verifikasi kode" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Masukkan 6 angka dari SMS.");
    expect(verifyOtp).not.toHaveBeenCalled();
  });

  it("lets the recipient retry after an OTP request network failure", async () => {
    vi.mocked(getClaim).mockResolvedValue({ senderName: "Andi", amountIdr: "1720000", corridor: "MY", status: "PENDING" });
    vi.mocked(requestOtp).mockRejectedValueOnce(new Error("Koneksi sedang bermasalah.")).mockResolvedValueOnce({ sent: true });
    await act(async () => { render(<ClaimPage params={Promise.resolve({ token: "opaque-token" })} />); });

    fireEvent.click(await screen.findByRole("button", { name: "Cairkan sekarang" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Koneksi sedang bermasalah.");

    fireEvent.click(screen.getByRole("button", { name: "Cairkan sekarang" }));
    expect(await screen.findByRole("button", { name: "Verifikasi kode" })).toBeInTheDocument();
    expect(requestOtp).toHaveBeenCalledTimes(2);
  });

  it("copies a cash-out code and confirms the action to the recipient", async () => {
    vi.mocked(getClaim).mockResolvedValue({ senderName: "Andi", amountIdr: "1720000", corridor: "MY", status: "PENDING" });
    vi.mocked(requestOtp).mockResolvedValue({ sent: true });
    vi.mocked(verifyOtp).mockResolvedValue({ ok: true, claimSession: "session-1" });
    vi.mocked(payout).mockResolvedValue({ status: "READY", cashCode: "SANGU-1234", instructions: "Tunjukkan kode ini di gerai." });
    await act(async () => { render(<ClaimPage params={Promise.resolve({ token: "opaque-token" })} />); });

    fireEvent.click(await screen.findByRole("button", { name: "Cairkan sekarang" }));
    fireEvent.change(await screen.findByRole("textbox", { name: "Kode OTP" }), { target: { value: "123456" } });
    fireEvent.click(screen.getByRole("button", { name: "Verifikasi kode" }));
    fireEvent.click(await screen.findByRole("button", { name: "Cairkan uang" }));

    expect(await screen.findByRole("heading", { name: "SANGU-1234" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Salin kode" }));
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("SANGU-1234");
    expect(await screen.findByRole("status")).toHaveTextContent("Kode penarikan disalin.");
  });

  it("guides the recipient through an interactive SEP-24 withdrawal", async () => {
    vi.mocked(getClaim).mockResolvedValue({ senderName: "Andi", amountIdr: "1720000", corridor: "MY", status: "PENDING" });
    vi.mocked(requestOtp).mockResolvedValue({ sent: true });
    vi.mocked(verifyOtp).mockResolvedValue({ ok: true, claimSession: "session-1" });
    vi.mocked(payout).mockResolvedValue({ status: "PAID_OUT", interactiveUrl: "https://anchor.example/interactive/withdrawal-1", anchorTxId: "anchor-1", instructions: "Selesaikan langkah verifikasi anchor." });
    await act(async () => { render(<ClaimPage params={Promise.resolve({ token: "opaque-token" })} />); });

    fireEvent.click(await screen.findByRole("button", { name: "Cairkan sekarang" }));
    fireEvent.change(await screen.findByRole("textbox", { name: "Kode OTP" }), { target: { value: "123456" } });
    fireEvent.click(screen.getByRole("button", { name: "Verifikasi kode" }));
    fireEvent.click(await screen.findByRole("button", { name: "Cairkan uang" }));

    expect(await screen.findByRole("heading", { name: "Pencairan sedang diproses" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Lanjutkan verifikasi pencairan" })).toHaveAttribute("href", "https://anchor.example/interactive/withdrawal-1");
    expect(screen.getByText("Referensi anchor: anchor-1")).toBeInTheDocument();
  });

  it("explains how to recover when a cash-out code cannot be copied", async () => {
    vi.mocked(getClaim).mockResolvedValue({ senderName: "Andi", amountIdr: "1720000", corridor: "MY", status: "PENDING" });
    vi.mocked(requestOtp).mockResolvedValue({ sent: true });
    vi.mocked(verifyOtp).mockResolvedValue({ ok: true, claimSession: "session-1" });
    vi.mocked(payout).mockResolvedValue({ status: "READY", cashCode: "SANGU-1234" });
    vi.mocked(navigator.clipboard.writeText).mockRejectedValue(new Error("Tidak diizinkan"));
    await act(async () => { render(<ClaimPage params={Promise.resolve({ token: "opaque-token" })} />); });

    fireEvent.click(await screen.findByRole("button", { name: "Cairkan sekarang" }));
    fireEvent.change(await screen.findByRole("textbox", { name: "Kode OTP" }), { target: { value: "123456" } });
    fireEvent.click(screen.getByRole("button", { name: "Verifikasi kode" }));
    fireEvent.click(await screen.findByRole("button", { name: "Cairkan uang" }));
    fireEvent.click(await screen.findByRole("button", { name: "Salin kode" }));

    expect(await screen.findByRole("status")).toHaveTextContent("Kode belum dapat disalin. Salin manual kode di atas.");
  });
});
