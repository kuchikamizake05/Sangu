import { describe, expect, it } from "vitest";
import { getPhoneCountry, normalizePhoneEntry, parsePhoneEntry } from "./phone-number";

describe("normalizePhoneEntry", () => {
  it("removes Indonesia's local trunk prefix before composing E.164", () => {
    expect(normalizePhoneEntry(getPhoneCountry("ID"), "0812-3456-7890")).toBe("+6281234567890");
  });

  it("removes Malaysia's local trunk prefix before composing E.164", () => {
    expect(normalizePhoneEntry(getPhoneCountry("MY"), "012 345 6789")).toBe("+60123456789");
  });

  it("keeps a complete international number for the Other country option", () => {
    expect(normalizePhoneEntry(getPhoneCountry("OTHER"), "+55 (11) 99876-5432")).toBe("+5511998765432");
  });
});

describe("parsePhoneEntry", () => {
  it("detects a supported country when a full number is pasted", () => {
    expect(parsePhoneEntry("+852 1234 5678")).toEqual({
      country: getPhoneCountry("HK"),
      localNumber: "12345678",
    });
  });

  it("keeps an unknown international number in the Other option", () => {
    expect(parsePhoneEntry("+55 11 99876 5432")).toEqual({
      country: getPhoneCountry("OTHER"),
      localNumber: "+5511998765432",
    });
  });
});
