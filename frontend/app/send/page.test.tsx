import { fireEvent, render, screen } from "@testing-library/react";
import { vi } from "vitest";
import { getQuote } from "@/lib/api";
import SendPage from "./page";

vi.mock("@/lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api")>()),
  getQuote: vi.fn(),
}));

describe("SendPage", () => {
  it("starts the transfer wizard without mixing it into the dashboard", () => {
    render(<SendPage />);

    expect(screen.getByRole("heading", { name: "Langkah 1 dari 4" })).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "Progress transfer" })).toHaveAttribute("aria-valuenow", "1");
    expect(screen.getByLabelText("Nomor WhatsApp penerima")).toBeInTheDocument();
  });

  it("keeps the loaded quote near the amount on mobile and in a sticky desktop summary", async () => {
    vi.mocked(getQuote).mockResolvedValue({
      amountIdr: "1750000",
      feeIdrEstimate: "12000",
      rateAsOf: "2026-07-13T09:00:00.000Z",
      comparison: { westernUnionFeeIdrEstimate: "35000" },
    });

    render(<SendPage />);
    fireEvent.click(screen.getByRole("button", { name: "Lanjutkan" }));
    fireEvent.click(screen.getByRole("button", { name: "Lihat estimasi" }));

    expect((await screen.findAllByText("ESTIMASI PENERIMA")).length).toBeGreaterThan(0);
    expect(screen.getByRole("complementary", { name: "Ringkasan transfer" })).toHaveClass("lg:sticky");
  });
});
