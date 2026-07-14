import { createRecurring, getTransfers } from "./api";

describe("transfer history API", () => {
  beforeEach(() => {
    window.localStorage.setItem("sangu.token", "test-token");
  });

  it("loads the sender's transfer history with the session token attached", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify([]), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(getTransfers()).resolves.toEqual([]);
    expect(fetchMock).toHaveBeenCalledWith("http://localhost:4000/api/transfers", expect.anything());
    const [, init] = fetchMock.mock.calls[0];
    expect(new Headers(init.headers).get("Authorization")).toBe("Bearer test-token");
  });

  it("creates a recurring-remittance schedule", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ recurringId: "monthly-1" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const body = { recipientPhone: "+628120000000", corridor: "MY" as const, amountForeign: "500", dayOfMonth: 1 };

    await expect(createRecurring(body)).resolves.toEqual({ recurringId: "monthly-1" });
    expect(fetchMock).toHaveBeenCalledWith("http://localhost:4000/api/recurring", expect.objectContaining({ method: "POST", body: JSON.stringify(body) }));
  });
});
