import type { Locale } from "./config";
import { account } from "./dictionaries/account";
import { claim } from "./dictionaries/claim";
import { common } from "./dictionaries/common";
import { footer } from "./dictionaries/footer";
import { home } from "./dictionaries/home";
import { landing } from "./dictionaries/landing";
import { login } from "./dictionaries/login";
import { send } from "./dictionaries/send";
import { settings } from "./dictionaries/settings";
import { transfers } from "./dictionaries/transfers";

export const dictionaries = {
  id: {
    account: account.id,
    claim: claim.id,
    common: common.id,
    footer: footer.id,
    home: home.id,
    landing: landing.id,
    login: login.id,
    send: send.id,
    settings: settings.id,
    transfers: transfers.id,
  },
  en: {
    account: account.en,
    claim: claim.en,
    common: common.en,
    footer: footer.en,
    home: home.en,
    landing: landing.en,
    login: login.en,
    send: send.en,
    settings: settings.en,
    transfers: transfers.en,
  },
} as const;

/** Resolve a dot-path like "footer.colProduct" against a nested dictionary. */
export function resolvePath(dict: unknown, path: string): string | undefined {
  const value = path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object" && key in acc) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, dict);
  return typeof value === "string" ? value : undefined;
}

export function translate(locale: Locale, key: string): string {
  return (
    resolvePath(dictionaries[locale], key) ??
    resolvePath(dictionaries.id, key) ??
    key
  );
}
