import { fireEvent, render, screen } from "@testing-library/react";
import GlobalError from "./global-error";

describe("GlobalError", () => {
  it("offers a safe retry action without exposing the original error", () => {
    const reset = vi.fn();
    render(<GlobalError error={new Error("sensitive internal detail")} reset={reset} />);

    expect(screen.getByText("Ada gangguan di aplikasi")).toBeInTheDocument();
    expect(screen.queryByText("sensitive internal detail")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Coba lagi" }));
    expect(reset).toHaveBeenCalledOnce();
  });
});
