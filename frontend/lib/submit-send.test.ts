import { submitSend } from "./api";

describe("submitSend", () => {
  it("submits only the transfer ID and signed XDR to the relayer endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ transferId: "transfer-1", escrowId: "1", claimUrl: "https://sangu.test/claim/a" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(submitSend({ transferId: "transfer-1", signedXDR: "signed-xdr" })).resolves.toMatchObject({ escrowId: "1" });
    expect(fetchMock).toHaveBeenCalledWith("http://localhost:4000/api/send/submit", expect.objectContaining({ method: "POST", body: JSON.stringify({ transferId: "transfer-1", signedXDR: "signed-xdr" }) }));
  });
});
