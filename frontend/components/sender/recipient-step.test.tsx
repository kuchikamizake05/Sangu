import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RecipientStep } from "./recipient-step";

function renderStep(overrides: Partial<React.ComponentProps<typeof RecipientStep>> = {}) {
  const props: React.ComponentProps<typeof RecipientStep> = {
    corridor: "MY",
    phone: "",
    methodHint: null,
    onCorridorChange: vi.fn(),
    onPhoneChange: vi.fn(),
    onMethodChange: vi.fn(),
    onContinue: vi.fn(),
    ...overrides,
  };
  render(<RecipientStep {...props} />);
  return props;
}

describe("RecipientStep", () => {
  it("shows a validation message and prevents continuation for an incomplete phone number", () => {
    renderStep({ phone: "0812" });

    expect(screen.getByText(/Gunakan format internasional/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Lanjutkan" })).toBeDisabled();
  });

  it("lets the sender select a corridor and toggle an optional payout method", () => {
    const props = renderStep({ phone: "+6281234567890", methodHint: "dana" });

    fireEvent.click(screen.getByRole("radio", { name: /Hong Kong/i }));
    fireEvent.click(screen.getByRole("button", { name: "DANA" }));
    fireEvent.change(screen.getByLabelText("Nomor WhatsApp penerima"), { target: { value: "+628987654321" } });
    fireEvent.click(screen.getByRole("button", { name: "Lanjutkan" }));

    expect(props.onCorridorChange).toHaveBeenCalledWith("HK");
    expect(props.onMethodChange).toHaveBeenCalledWith(null);
    expect(props.onPhoneChange).toHaveBeenCalledWith("+628987654321");
    expect(props.onContinue).toHaveBeenCalledOnce();
  });
});
