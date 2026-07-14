import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SendSuccess } from "./send-success";

describe("SendSuccess", () => {
  afterEach(() => vi.restoreAllMocks());

  it("copies the claim link when sharing is unavailable", async () => {
    Object.assign(navigator, { share: undefined, clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } });
    render(<SendSuccess amountLabel="RM 100" recipientPhone="+62812••••" claimUrl="https://sangu.test/claim/one" onBackHome={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Bagikan link ke WhatsApp" }));

    await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalledWith("https://sangu.test/claim/one"));
    expect(screen.getByRole("status")).toHaveTextContent("Link claim sudah disalin.");
  });

  it("shows a useful notice when sharing is cancelled", async () => {
    Object.assign(navigator, { share: vi.fn().mockRejectedValue(new Error("cancelled")) });
    render(<SendSuccess amountLabel="RM 100" recipientPhone="+62812••••" claimUrl="https://sangu.test/claim/one" onBackHome={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Bagikan link ke WhatsApp" }));

    expect(await screen.findByRole("status")).toHaveTextContent("Link claim belum dibagikan.");
  });

  it("returns home when the sender chooses to finish", () => {
    const onBackHome = vi.fn();
    render(<SendSuccess amountLabel="RM 100" recipientPhone="+62812••••" claimUrl="https://sangu.test/claim/one" onBackHome={onBackHome} />);

    fireEvent.click(screen.getByRole("button", { name: "Kembali ke Beranda" }));

    expect(onBackHome).toHaveBeenCalledOnce();
  });
});
