import { render, screen } from "@testing-library/react";
import LandingPage from "./page";

describe("LandingPage", () => {
  it("renders the public landing page and routes visitors into the app", () => {
    render(<LandingPage />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/Sangu pulang untuk/);
    expect(screen.getByRole("link", { name: "Buka app" })).toHaveAttribute("href", "/app");
    expect(screen.getAllByRole("link", { name: "Buka akun gratis" }).every((link) => link.getAttribute("href") === "/app")).toBe(true);
    expect(screen.getByRole("heading", { name: "Kurs asli, bukan kurs-kursan." })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Mata uang asal" })).toBeInTheDocument();
    expect(screen.getByRole("contentinfo")).toHaveTextContent("© 2026 Sangu");
  });
});
