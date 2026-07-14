import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { submitSend } from "@/lib/api";
import { signWithPasskey } from "@/lib/passkey-wallet";
import { TransactionConfirmation } from "./transaction-confirmation";

vi.mock("@/lib/api", () => ({ submitSend: vi.fn() }));
vi.mock("@/lib/passkey-wallet", () => ({ signWithPasskey: vi.fn() }));

describe("TransactionConfirmation", () => {
  it("signs the prepared XDR, submits it, presents a shareable claim link, and notifies onDone", async () => {
    vi.mocked(signWithPasskey).mockResolvedValue("signed-xdr");
    vi.mocked(submitSend).mockResolvedValue({ transferId: "transfer-1", escrowId: "1", claimUrl: "https://sangu.test/claim/token" });
    const onDone = vi.fn();
    render(<TransactionConfirmation transferId="transfer-1" unsignedXDR="unsigned-xdr" onDone={onDone} />);

    fireEvent.click(screen.getByRole("button", { name: "Konfirmasi dengan sidik jari" }));
    await expect(screen.findByText("Bagikan link ke keluarga")).resolves.toBeInTheDocument();
    expect(signWithPasskey).toHaveBeenCalledWith("unsigned-xdr");
    expect(submitSend).toHaveBeenCalledWith({ transferId: "transfer-1", signedXDR: "signed-xdr" });
    expect(onDone).toHaveBeenCalledWith("https://sangu.test/claim/token");
  });

  it("returns to a retryable state when a passkey prompt is rejected", async () => {
    vi.mocked(signWithPasskey).mockRejectedValue(new Error("Sidik jari dibatalkan."));
    render(<TransactionConfirmation transferId="transfer-1" unsignedXDR="unsigned-xdr" />);

    fireEvent.click(screen.getByRole("button", { name: "Konfirmasi dengan sidik jari" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Sidik jari dibatalkan.");
    expect(screen.getByRole("button", { name: "Konfirmasi dengan sidik jari" })).toBeEnabled();
  });

  it("retries confirmation from the inline error action", async () => {
    vi.mocked(signWithPasskey).mockRejectedValueOnce(new Error("Sidik jari dibatalkan."));
    vi.mocked(signWithPasskey).mockResolvedValueOnce("signed-xdr");
    vi.mocked(submitSend).mockResolvedValue({ transferId: "transfer-1", escrowId: "1", claimUrl: "https://sangu.test/claim/token" });
    render(<TransactionConfirmation transferId="transfer-1" unsignedXDR="unsigned-xdr" />);

    fireEvent.click(screen.getByRole("button", { name: "Konfirmasi dengan sidik jari" }));
    await screen.findByRole("alert");
    fireEvent.click(screen.getByRole("button", { name: "Coba lagi" }));
    await expect(screen.findByText("Bagikan link ke keluarga")).resolves.toBeInTheDocument();
  });

  it("copies the link when the browser share sheet is unavailable", async () => {
    vi.mocked(signWithPasskey).mockResolvedValue("signed-xdr");
    vi.mocked(submitSend).mockResolvedValue({ transferId: "transfer-1", escrowId: "1", claimUrl: "https://sangu.test/claim/token" });
    Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } });
    render(<TransactionConfirmation transferId="transfer-1" unsignedXDR="unsigned-xdr" />);

    fireEvent.click(screen.getByRole("button", { name: "Konfirmasi dengan sidik jari" }));
    await screen.findByText("Bagikan link ke keluarga");
    fireEvent.click(screen.getByRole("button", { name: "Bagikan via WhatsApp" }));
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Link claim sudah disalin."));
  });
});
