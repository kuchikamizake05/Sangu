import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, vi } from "vitest";
import { getQuote, markRecurringSent, prepareSend, type Quote } from "@/lib/api";
import { signWithPasskey } from "@/lib/passkey-wallet";
import { submitSend } from "@/lib/api";
import SendPage from "./page";

vi.mock("@/lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api")>()),
  getQuote: vi.fn(),
  prepareSend: vi.fn(),
  submitSend: vi.fn(),
  markRecurringSent: vi.fn().mockResolvedValue({ recurringId: "r1", dueNow: false }),
  getMe: vi.fn().mockResolvedValue({ senderId: "s1", name: "Test", phoneMasked: "+628•••00", hasPasskey: true, walletAddress: null }),
}));

vi.mock("@/lib/passkey-wallet", () => ({ signWithPasskey: vi.fn() }));

const sampleQuote: Quote = {
  rate: "3500",
  amountIdr: "1750000",
  estimate: true,
  rateSource: "test",
  feeIdrEstimate: "12000",
  rateAsOf: "2026-07-13T09:00:00.000Z",
  comparison: { westernUnionFeeIdrEstimate: "35000", note: "estimasi" },
};

function fillPhoneAndContinue() {
  fireEvent.change(screen.getByLabelText("Nomor WhatsApp penerima"), { target: { value: "+628120000000" } });
  fireEvent.click(screen.getByRole("button", { name: "Lanjutkan" }));
}

function typeAmount(digits: string) {
  for (const digit of digits) {
    fireEvent.click(screen.getByRole("button", { name: `Angka ${digit}` }));
  }
}

describe("SendPage", () => {
  beforeEach(() => {
    window.localStorage.setItem("sangu.token", "test-token");
    window.history.pushState({}, "", "/send");
    vi.mocked(getQuote).mockResolvedValue(sampleQuote);
  });

  it("starts the flow at the recipient step", () => {
    render(<SendPage />);

    expect(screen.getByRole("heading", { name: "Kirim ke siapa?" })).toBeInTheDocument();
    expect(screen.getByLabelText("Nomor WhatsApp penerima")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Lanjutkan" })).toBeDisabled();
  });

  it("blocks continuing past the recipient step with an invalid phone number", () => {
    render(<SendPage />);

    fireEvent.change(screen.getByLabelText("Nomor WhatsApp penerima"), { target: { value: "08120000" } });
    expect(screen.getByRole("button", { name: "Lanjutkan" })).toBeDisabled();
  });

  it("moves to the amount screen and shows a live quote once typed", async () => {
    render(<SendPage />);
    fillPhoneAndContinue();

    expect(screen.getByText("$ 0")).toBeInTheDocument();
    typeAmount("250");

    await waitFor(() => expect(getQuote).toHaveBeenCalledWith("US", "250"));
    expect(await screen.findByText(/Rp 1.750.000 untuk penerima/)).toBeInTheDocument();
  });

  it("prepares the transfer on entering the confirmation step and lets the sender confirm", async () => {
    vi.mocked(prepareSend).mockResolvedValue({
      transferId: "transfer-1",
      unsignedXDR: "unsigned-xdr",
      quote: sampleQuote,
      expiry: Math.floor(Date.now() / 1000) + 600,
    });
    vi.mocked(signWithPasskey).mockResolvedValue("signed-xdr");
    vi.mocked(submitSend).mockResolvedValue({ transferId: "transfer-1", escrowId: "1", claimUrl: "https://sangu.test/claim/token" });

    render(<SendPage />);
    fillPhoneAndContinue();
    typeAmount("250");
    await screen.findByText(/Rp 1.750.000 untuk penerima/);
    fireEvent.click(screen.getByRole("button", { name: "Lanjutkan" }));

    await waitFor(() => expect(prepareSend).toHaveBeenCalledWith({ corridor: "US", amountForeign: "250", recipientPhone: "+628120000000", methodHint: undefined }));
    expect(await screen.findByRole("button", { name: "Konfirmasi dengan sidik jari" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Konfirmasi dengan sidik jari" }));
    expect(await screen.findByText("Terkirim!")).toBeInTheDocument();
    expect(screen.getByText(/\$ 250.00/)).toBeInTheDocument();
  });

  it("shows a retryable error when prepareSend fails", async () => {
    vi.mocked(prepareSend).mockRejectedValue(new Error("Transfer belum dapat disiapkan."));

    render(<SendPage />);
    fillPhoneAndContinue();
    typeAmount("250");
    await screen.findByText(/Rp 1.750.000 untuk penerima/);
    fireEvent.click(screen.getByRole("button", { name: "Lanjutkan" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Transfer belum dapat disiapkan.");
  });

  it("prefills from query params and jumps straight to the amount step", async () => {
    window.history.pushState({}, "", "/send?recipient=%2B628120000000&corridor=HK&amount=300");

    render(<SendPage />);

    expect(screen.getByText("HK$ 300")).toBeInTheDocument();
    await waitFor(() => expect(getQuote).toHaveBeenCalledWith("HK", "300"));
  });

  it("marks a recurring schedule as sent after a successful confirmation when recurringId is present", async () => {
    window.history.pushState({}, "", "/send?recipient=%2B628120000000&corridor=MY&amount=250&recurringId=r1");
    vi.mocked(prepareSend).mockResolvedValue({
      transferId: "transfer-1",
      unsignedXDR: "unsigned-xdr",
      quote: sampleQuote,
      expiry: Math.floor(Date.now() / 1000) + 600,
    });
    vi.mocked(signWithPasskey).mockResolvedValue("signed-xdr");
    vi.mocked(submitSend).mockResolvedValue({ transferId: "transfer-1", escrowId: "1", claimUrl: "https://sangu.test/claim/token" });

    render(<SendPage />);
    await screen.findByText(/Rp 1.750.000 untuk penerima/);
    fireEvent.click(screen.getByRole("button", { name: "Lanjutkan" }));
    fireEvent.click(await screen.findByRole("button", { name: "Konfirmasi dengan sidik jari" }));

    await screen.findByText("Terkirim!");
    await waitFor(() => expect(markRecurringSent).toHaveBeenCalledWith("r1"));
  });
});
