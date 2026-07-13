import { fireEvent, render, screen } from "@testing-library/react";
import SenderPage from "./page";

describe("SenderPage", () => {
  it("keeps the dashboard focused and sends transfer actions to the canonical composer route", () => {
    render(<SenderPage />);

    fireEvent.click(screen.getByRole("button", { name: "Siapkan akses perangkat" }));
    expect(screen.getByText("Saldo tersedia")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Kirim uang" }).every((link) => link.getAttribute("href") === "/send")).toBe(true);
    expect(screen.queryByRole("button", { name: "Kirim uang" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Langkah 1 dari 4" })).not.toBeInTheDocument();
  });
});
