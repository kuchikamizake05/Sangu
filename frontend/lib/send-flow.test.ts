import { appendDigit, deleteDigit, formatForeignAmount, isE164Phone } from "./send-flow";

describe("isE164Phone", () => {
  it("accepts an international WhatsApp number", () => {
    expect(isE164Phone("+628120000000")).toBe(true);
  });

  it("rejects a local-format number", () => {
    expect(isE164Phone("08120000000")).toBe(false);
  });
});

describe("formatForeignAmount", () => {
  it("formats decimal amounts with the selected corridor currency", () => {
    expect(formatForeignAmount("500", "MY")).toBe("RM 500.00");
    expect(formatForeignAmount("1234.5", "HK")).toBe("HK$1,234.50");
  });
});

describe("appendDigit", () => {
  it("builds up a plain integer amount digit by digit", () => {
    let amount = "";
    amount = appendDigit(amount, "2");
    amount = appendDigit(amount, "5");
    amount = appendDigit(amount, "0");
    expect(amount).toBe("250");
  });

  it("starts a decimal amount from an empty value when '.' is pressed first", () => {
    expect(appendDigit("", ".")).toBe("0.");
  });

  it("prevents a duplicate leading zero and replaces it with the next digit", () => {
    expect(appendDigit("0", "0")).toBe("0");
    expect(appendDigit("0", "5")).toBe("5");
  });

  it("allows at most two decimal digits", () => {
    expect(appendDigit("12.5", "6")).toBe("12.56");
    expect(appendDigit("12.56", "7")).toBe("12.56");
  });

  it("allows only a single decimal point", () => {
    expect(appendDigit("12.5", ".")).toBe("12.5");
  });

  it("caps the integer part at six digits", () => {
    expect(appendDigit("123456", "7")).toBe("123456");
  });

  it("ignores keys that are not digits, '.', or 'del'", () => {
    expect(appendDigit("12", "x")).toBe("12");
  });

  it("routes the 'del' key through deleteDigit", () => {
    expect(appendDigit("12.5", "del")).toBe("12.");
  });
});

describe("deleteDigit", () => {
  it("removes the last character", () => {
    expect(deleteDigit("12.5")).toBe("12.");
    expect(deleteDigit("0.")).toBe("0");
  });

  it("stays empty when there is nothing left to delete", () => {
    expect(deleteDigit("")).toBe("");
  });
});
