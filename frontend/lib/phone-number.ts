export type PhoneCountry = {
  iso: string;
  label: string;
  dialCode: string;
  flag: string;
};

export const PHONE_COUNTRIES: PhoneCountry[] = [
  { iso: "ID", label: "Indonesia", dialCode: "+62", flag: "🇮🇩" },
  { iso: "MY", label: "Malaysia", dialCode: "+60", flag: "🇲🇾" },
  { iso: "HK", label: "Hong Kong", dialCode: "+852", flag: "🇭🇰" },
  { iso: "TW", label: "Taiwan", dialCode: "+886", flag: "🇹🇼" },
  { iso: "SA", label: "Arab Saudi", dialCode: "+966", flag: "🇸🇦" },
  { iso: "SG", label: "Singapura", dialCode: "+65", flag: "🇸🇬" },
  { iso: "AE", label: "Uni Emirat Arab", dialCode: "+971", flag: "🇦🇪" },
  { iso: "KR", label: "Korea Selatan", dialCode: "+82", flag: "🇰🇷" },
  { iso: "JP", label: "Jepang", dialCode: "+81", flag: "🇯🇵" },
  { iso: "BN", label: "Brunei", dialCode: "+673", flag: "🇧🇳" },
  { iso: "TH", label: "Thailand", dialCode: "+66", flag: "🇹🇭" },
  { iso: "OTHER", label: "Negara lain", dialCode: "", flag: "🌐" },
];

export function getPhoneCountry(iso: string): PhoneCountry {
  return PHONE_COUNTRIES.find((country) => country.iso === iso) ?? PHONE_COUNTRIES[0];
}

function compact(value: string): string {
  return value.trim().replace(/[\s().-]/g, "");
}

export function normalizePhoneEntry(country: PhoneCountry, localNumber: string): string {
  const value = compact(localNumber);
  if (country.iso === "OTHER") {
    const digits = value.replace(/\D/g, "");
    return digits ? `+${digits}` : "";
  }
  const localDigits = value.replace(/\D/g, "").replace(/^0+/, "");
  return localDigits ? `${country.dialCode}${localDigits}` : country.dialCode;
}

export function formatLocalPhone(localNumber: string): string {
  if (localNumber.startsWith("+")) return localNumber;
  const digits = localNumber.replace(/\D/g, "");
  return [digits.slice(0, 4), digits.slice(4, 7), digits.slice(7)].filter(Boolean).join(" - ");
}

export function parsePhoneEntry(value: string): { country: PhoneCountry; localNumber: string } {
  const compactValue = compact(value);
  if (!compactValue.startsWith("+")) return { country: getPhoneCountry("ID"), localNumber: compactValue.replace(/\D/g, "") };

  const normalized = `+${compactValue.slice(1).replace(/\D/g, "")}`;
  const country = PHONE_COUNTRIES
    .filter((candidate) => candidate.iso !== "OTHER")
    .sort((left, right) => right.dialCode.length - left.dialCode.length)
    .find((candidate) => normalized.startsWith(candidate.dialCode));

  if (!country) return { country: getPhoneCountry("OTHER"), localNumber: normalized };
  return { country, localNumber: normalized.slice(country.dialCode.length) };
}
