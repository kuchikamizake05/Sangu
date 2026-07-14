import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearSession,
  getLastPhone,
  getStoredSender,
  getToken,
  getWalletInfo,
  onUnauthorized,
  setLastPhone,
  setSession,
  setWalletInfo,
} from "./auth-session";
import type { SenderProfile } from "./api";

const sender: SenderProfile = { senderId: "s1", name: "Budi", phoneMasked: "+628•••00", hasPasskey: true };

describe("auth-session", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("stores and reads back token + sender via setSession", () => {
    expect(getToken()).toBeNull();
    expect(getStoredSender()).toBeNull();

    setSession({ token: "jwt-token", sender });

    expect(getToken()).toBe("jwt-token");
    expect(getStoredSender()).toEqual(sender);
  });

  it("stores and reads wallet info separately from the session", () => {
    expect(getWalletInfo()).toEqual({ keyId: null, walletAddress: null });

    setWalletInfo({ keyId: "key-1", walletAddress: "C123" });

    expect(getWalletInfo()).toEqual({ keyId: "key-1", walletAddress: "C123" });
  });

  it("stores and reads the last used phone", () => {
    expect(getLastPhone()).toBeNull();
    setLastPhone("+628120000000");
    expect(getLastPhone()).toBe("+628120000000");
  });

  it("clearSession removes token + sender but keeps lastPhone", () => {
    setSession({ token: "jwt-token", sender });
    setLastPhone("+628120000000");

    clearSession();

    expect(getToken()).toBeNull();
    expect(getStoredSender()).toBeNull();
    expect(getLastPhone()).toBe("+628120000000");
  });

  it("onUnauthorized clears the session and redirects to /login with a next param", () => {
    setSession({ token: "jwt-token", sender });
    const assign = vi.fn();
    Object.defineProperty(window, "location", {
      value: { pathname: "/transfers", search: "?filter=ALL", assign },
      writable: true,
    });

    onUnauthorized();

    expect(getToken()).toBeNull();
    expect(assign).toHaveBeenCalledWith("/login?next=%2Ftransfers%3Ffilter%3DALL");
  });
});
