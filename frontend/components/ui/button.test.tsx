import { fireEvent, render, screen } from "@testing-library/react";
import { Button } from "./button";

describe("Button", () => {
  it("uses the primary visual treatment by default", () => {
    render(<Button>Kirim uang</Button>);

    expect(screen.getByRole("button", { name: "Kirim uang" })).toHaveAttribute("data-variant", "primary");
  });

  it("does not trigger an action while disabled", () => {
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        Lanjutkan
      </Button>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Lanjutkan" }));
    expect(onClick).not.toHaveBeenCalled();
  });
});
