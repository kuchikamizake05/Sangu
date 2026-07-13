import { requestOtp, verifyOtp } from "./api";

describe("claim OTP API", () => {
  it("requests an OTP for the opaque claim token", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ sent: true }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(requestOtp("opaque-token")).resolves.toEqual({ sent: true });
    expect(fetchMock).toHaveBeenCalledWith("http://localhost:4000/api/claim/opaque-token/otp/request", { method: "POST" });
  });

  it("submits only the entered OTP code for verification", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true, claimSession: "session-1" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(verifyOtp("opaque-token", "123456")).resolves.toMatchObject({ claimSession: "session-1" });
    expect(fetchMock).toHaveBeenCalledWith("http://localhost:4000/api/claim/opaque-token/otp/verify", expect.objectContaining({ method: "POST", body: JSON.stringify({ code: "123456" }) }));
  });
});
