import { render, screen } from "@testing-library/react";
import { StatusBadge } from "./status-badge";

describe("StatusBadge", () => {
  it("pairs a human-readable success label with a semantic status", () => {
    render(<StatusBadge status="PAID_OUT" />);

    expect(screen.getByText("Sudah dicairkan")).toHaveAttribute("data-tone", "success");
  });
});
