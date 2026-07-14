// Sesi pengirim tersimpan di localStorage (kontrak §2 — demo hackathon, tanpa cookie).
"use client";

import { useEffect, useState } from "react";
import type { SenderProfile } from "./api";

const KEY_TOKEN = "sangu.token";
const KEY_SENDER = "sangu.sender";
const KEY_KEY_ID = "sangu.keyId";
const KEY_WALLET_ADDRESS = "sangu.walletAddress";
const KEY_LAST_PHONE = "sangu.lastPhone";

function isBrowser() {
  return typeof window !== "undefined";
}

export function getToken(): string | null {
  if (!isBrowser()) return null;
  return window.localStorage.getItem(KEY_TOKEN);
}

export function getStoredSender(): SenderProfile | null {
  if (!isBrowser()) return null;
  const raw = window.localStorage.getItem(KEY_SENDER);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SenderProfile;
  } catch {
    return null;
  }
}

export function setSession({ token, sender }: { token: string; sender: SenderProfile }): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(KEY_TOKEN, token);
  window.localStorage.setItem(KEY_SENDER, JSON.stringify(sender));
}

export function setWalletInfo({ keyId, walletAddress }: { keyId: string; walletAddress: string }): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(KEY_KEY_ID, keyId);
  window.localStorage.setItem(KEY_WALLET_ADDRESS, walletAddress);
}

export function getWalletInfo(): { keyId: string | null; walletAddress: string | null } {
  if (!isBrowser()) return { keyId: null, walletAddress: null };
  return {
    keyId: window.localStorage.getItem(KEY_KEY_ID),
    walletAddress: window.localStorage.getItem(KEY_WALLET_ADDRESS),
  };
}

export function setLastPhone(phone: string): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(KEY_LAST_PHONE, phone);
}

export function getLastPhone(): string | null {
  if (!isBrowser()) return null;
  return window.localStorage.getItem(KEY_LAST_PHONE);
}

/** Hapus token + sender; sengaja tidak menghapus lastPhone/keyId/walletAddress supaya login berikutnya tetap cepat. */
export function clearSession(): void {
  if (!isBrowser()) return;
  window.localStorage.removeItem(KEY_TOKEN);
  window.localStorage.removeItem(KEY_SENDER);
}

/** Dipanggil saat backend membalas 401 di mana pun: bersihkan sesi lalu lempar ke /login. */
export function onUnauthorized(): void {
  if (!isBrowser()) return;
  clearSession();
  const path = `${window.location.pathname}${window.location.search}`;
  window.location.assign(`/login?next=${encodeURIComponent(path)}`);
}

export type SessionStatus = "loading" | "authed" | "guest";

export function useSession(): { sender: SenderProfile | null; status: SessionStatus } {
  const [state, setState] = useState<{ sender: SenderProfile | null; status: SessionStatus }>({ sender: null, status: "loading" });

  useEffect(() => {
    const token = getToken();
    const sender = getStoredSender();
    setState(token ? { sender, status: "authed" } : { sender: null, status: "guest" });
  }, []);

  return state;
}
