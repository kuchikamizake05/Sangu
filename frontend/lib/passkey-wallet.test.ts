import { getPasskeyConfig, signUnsignedXdr } from "./passkey-wallet";

describe("passkey wallet adapter", () => {
  it("rejects signing when public smart-wallet configuration is incomplete", () => {
    expect(() => getPasskeyConfig({ rpcUrl: "", networkPassphrase: "test", walletWasmHash: "hash" })).toThrow("NEXT_PUBLIC_STELLAR_RPC_URL");
  });

  it("connects the passkey wallet and serializes the signed transaction to XDR", async () => {
    const connectWallet = vi.fn().mockResolvedValue({});
    const sign = vi.fn().mockResolvedValue({ toXDR: () => "signed-xdr" });

    await expect(signUnsignedXdr("unsigned-xdr", { rpcUrl: "rpc", networkPassphrase: "test", walletWasmHash: "hash" }, () => ({ connectWallet, sign }))).resolves.toBe("signed-xdr");
    expect(connectWallet).toHaveBeenCalledOnce();
    expect(sign).toHaveBeenCalledWith("unsigned-xdr", { keyId: "any" });
  });
});
