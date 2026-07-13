import { canAdvance, formatForeignAmount, isE164Phone } from "./send-flow";

describe("sender flow helpers", () => {
  it("accepts a complete recipient and amount step", () => {
    expect(canAdvance({ step: 2, amount: "500", phone: "+628120000000", hasQuote: true })).toBe(true);
  });

  it("blocks an invalid recipient number before the review step", () => {
    expect(isE164Phone("08120000000")).toBe(false);
    expect(canAdvance({ step: 1, amount: "500", phone: "08120000000", hasQuote: false })).toBe(false);
  });

  it("formats decimal amounts with the selected corridor currency", () => {
    expect(formatForeignAmount("500", "MY")).toBe("RM 500.00");
    expect(formatForeignAmount("1234.5", "HK")).toBe("HK$1,234.50");
  });

  it("allows the optional payout and review steps to continue", () => {
    expect(canAdvance({ step: 3, amount: "", phone: "", hasQuote: false })).toBe(true);
  });
});
