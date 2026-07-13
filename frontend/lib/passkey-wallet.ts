export interface PasskeyConfig {
  rpcUrl: string;
  networkPassphrase: string;
  walletWasmHash: string;
}

interface PasskeyWallet {
  connectWallet(): Promise<unknown>;
  sign(xdr: string, options: { keyId: "any" }): Promise<{ toXDR(): string }>;
}

type WalletFactory = (config: PasskeyConfig) => PasskeyWallet;

export function getPasskeyConfig(config: PasskeyConfig): PasskeyConfig {
  if (!config.rpcUrl) throw new Error("NEXT_PUBLIC_STELLAR_RPC_URL belum diatur.");
  if (!config.networkPassphrase) throw new Error("NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE belum diatur.");
  if (!config.walletWasmHash) throw new Error("NEXT_PUBLIC_SMART_WALLET_WASM_HASH belum diatur.");
  return config;
}

export async function signUnsignedXdr(unsignedXDR: string, config: PasskeyConfig, createWallet: WalletFactory) {
  const wallet = createWallet(getPasskeyConfig(config));
  await wallet.connectWallet();
  const signed = await wallet.sign(unsignedXDR, { keyId: "any" });
  return signed.toXDR();
}

export async function signWithPasskey(unsignedXDR: string) {
  const config = getPasskeyConfig({
    rpcUrl: process.env.NEXT_PUBLIC_STELLAR_RPC_URL ?? "",
    networkPassphrase: process.env.NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE ?? "",
    walletWasmHash: process.env.NEXT_PUBLIC_SMART_WALLET_WASM_HASH ?? "",
  });
  const { PasskeyKit } = await import("passkey-kit");
  return signUnsignedXdr(unsignedXDR, config, (settings) => new PasskeyKit({
    rpcUrl: settings.rpcUrl,
    networkPassphrase: settings.networkPassphrase,
    walletWasmHash: settings.walletWasmHash,
  }));
}
