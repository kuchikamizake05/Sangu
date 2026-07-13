import { render, screen } from "@testing-library/react";
import { Field, SelectInput, TextInput } from "./field";

describe("form primitives", () => {
  it("associates an input with its label and helper text", () => {
    render(<Field label="Nomor penerima" hint="Gunakan format +62"><TextInput placeholder="+62812" /></Field>);

    expect(screen.getByLabelText("Nomor penerima")).toHaveAttribute("placeholder", "+62812");
    expect(screen.getByText("Gunakan format +62")).toBeInTheDocument();
  });

  it("renders a styled select input", () => {
    render(<SelectInput aria-label="Koridor"><option>Malaysia</option></SelectInput>);

    expect(screen.getByRole("combobox", { name: "Koridor" })).toBeInTheDocument();
  });
});
