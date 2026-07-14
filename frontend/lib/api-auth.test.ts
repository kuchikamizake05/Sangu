import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, getMe, getTransfers, requestAuthOtp } from "./api";
import { clearSession, setSession } from "./auth-session";

describe("authFetch", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("attaches the Bearer token from the stored session", async () => {
    setSession({ token: "jwt-token", sender: { senderId: "s1", name: "Budi", phoneMasked: "+628•••00", hasPasskey: true } });
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ senderId: "s1", name: "Budi", phoneMasked: "+628•••00", hasPasskey: true, walletAddress: null }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await getMe();

    const [, init] = fetchMock.mock.calls[0];
    expect(new Headers(init.headers).get("Authorization")).toBe("Bearer jwt-token");
  });

  it("clears the session and throws on a 401 response", async () => {
    setSession({ token: "jwt-token", sender: { senderId: "s1", name: "Budi", phoneMasked: "+628•••00", hasPasskey: true } });
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: { code: "UNAUTHORIZED", message: "kedaluwarsa" } }), { status: 401 }));
    vi.stubGlobal("fetch", fetchMock);
    const assign = vi.fn();
    Object.defineProperty(window, "location", { value: { pathname: "/app", search: "", assign }, writable: true });

    await expect(getTransfers()).rejects.toBeInstanceOf(ApiError);

    expect(localStorage.getItem("sangu.token")).toBeNull();
    expect(assign).toHaveBeenCalledWith(expect.stringContaining("/login?next="));
  });

  it("surfaces the backend error code for OTP rate limiting", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: { code: "OTP_RATE_LIMITED", message: "terlalu sering" } }), { status: 429 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(requestAuthOtp("+628120000000")).rejects.toMatchObject({ code: "OTP_RATE_LIMITED", message: "terlalu sering" });
  });

  afterEach(() => {
    clearSession();
  });
});
