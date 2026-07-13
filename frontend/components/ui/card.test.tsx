import { render, screen } from "@testing-library/react";
import { Card } from "./card";

describe("Card", () => {
  it("provides a semantic section container", () => {
    render(<Card aria-label="Ringkasan transfer">Isi ringkasan</Card>);

    expect(screen.getByRole("region", { name: "Ringkasan transfer" })).toHaveTextContent("Isi ringkasan");
  });
});
