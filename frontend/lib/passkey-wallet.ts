import type { PublicKeyCredentialCreationOptionsJSON, RegistrationResponseJSON } from "@simplewebauthn/browser";
import { deployWallet, getPasskeyLoginOptions, getPasskeyRegisterOptions, verifyPasskeyLogin, verifyPasskeyRegister, type AuthSuccess } from "./api";
import { getWalletInfo } from "./auth-session";

export interface PasskeyConfig {
  rpcUrl: string;
  networkPassphrase: string;
  walletWasmHash: string;
}

interface PasskeyWallet {
  connectWallet(options?: { keyId?: string }): Promise<unknown>;
  sign(xdr: string, options: { keyId: "any" }): Promise<{ toXDR(): string }>;
}

type WalletFactory = (config: PasskeyConfig) => PasskeyWallet;

export function getPasskeyConfig(config: PasskeyConfig): PasskeyConfig {
  // Nama env yang hilang dicatat ke console untuk developer; pesan yang dilempar (dan bisa
  // tampil di UI) harus bebas istilah teknis.
  const missing = [
    !config.rpcUrl && "NEXT_PUBLIC_STELLAR_RPC_URL",
    !config.networkPassphrase && "NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE",
    !config.walletWasmHash && "NEXT_PUBLIC_SMART_WALLET_WASM_HASH",
  ].filter(Boolean);
  if (missing.length > 0) {
    console.error(`Konfigurasi belum lengkap: ${missing.join(", ")} belum diatur.`);
    throw new Error("Fitur sidik jari belum dapat digunakan saat ini. Coba lagi nanti.");
  }
  return config;
}

function readSmartWalletConfig(): PasskeyConfig {
  return getPasskeyConfig({
    rpcUrl: process.env.NEXT_PUBLIC_STELLAR_RPC_URL ?? "",
    networkPassphrase: process.env.NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE ?? "",
    walletWasmHash: process.env.NEXT_PUBLIC_SMART_WALLET_WASM_HASH ?? "",
  });
}

export async function signUnsignedXdr(unsignedXDR: string, config: PasskeyConfig, createWallet: WalletFactory, keyId?: string | null) {
  const wallet = createWallet(getPasskeyConfig(config));
  await wallet.connectWallet(keyId ? { keyId } : undefined);
  const signed = await wallet.sign(unsignedXDR, { keyId: "any" });
  return signed.toXDR();
}

/** Konfirmasi transfer dengan sidik jari — dipakai keyId tersimpan dari registrasi bila ada. */
export async function signWithPasskey(unsignedXDR: string) {
  const config = readSmartWalletConfig();
  const { keyId } = getWalletInfo();
  const { PasskeyKit } = await import("passkey-kit");
  return signUnsignedXdr(unsignedXDR, config, (settings) => new PasskeyKit({
    rpcUrl: settings.rpcUrl,
    networkPassphrase: settings.networkPassphrase,
    walletWasmHash: settings.walletWasmHash,
  }), keyId);
}

/** Login harian: assertion sidik jari phone-keyed (§2.2) → sesi baru. Pemanggil yang menyimpan sesi (setSession). */
export async function loginWithPasskey(phone: string): Promise<AuthSuccess> {
  const options = await getPasskeyLoginOptions(phone);
  const { startAuthentication } = await import("@simplewebauthn/browser");
  const assertion = await startAuthentication({ optionsJSON: options });
  return verifyPasskeyLogin(phone, assertion);
}

/**
 * Registrasi sidik jari + pembuatan smart wallet (setup pertama).
 * Backend menyimpan challenge WebAuthn di `auth_challenges` dan mencocokkannya dari clientDataJSON
 * saat verify — jadi PasskeyKit HARUS memakai persis options (termasuk challenge) dari backend, bukan
 * options bawaannya sendiri. Kita injeksikan dengan mengganti seluruh `optionsJSON` yang dikirim kit ke
 * `startRegistration` dengan options backend sebelum diteruskan ke @simplewebauthn/browser asli.
 */
export async function registerPasskeyAndWallet(senderName: string): Promise<{ keyIdBase64: string; contractId: string }> {
  const backendOptions = await getPasskeyRegisterOptions();
  const config = readSmartWalletConfig();
  const { startRegistration, startAuthentication } = await import("@simplewebauthn/browser");
  const { PasskeyKit } = await import("passkey-kit");

  const kit = new PasskeyKit({
    rpcUrl: config.rpcUrl,
    networkPassphrase: config.networkPassphrase,
    walletWasmHash: config.walletWasmHash,
    WebAuthn: {
      startRegistration: (_opts: { optionsJSON: PublicKeyCredentialCreationOptionsJSON; useAutoRegister?: boolean }) =>
        startRegistration({ optionsJSON: backendOptions }),
      startAuthentication,
    },
  });

  const { rawResponse, keyIdBase64, contractId, signedTx } = await kit.createWallet("Sangu", senderName);

  // Deploy kontrak smart wallet DULU (backend fee-bump + submit; no-op di mode demo) —
  // baru daftarkan credential ke backend. Urutan ini menjaga invarian: walletAddress yang
  // tersimpan di backend selalu menunjuk kontrak yang benar-benar ada. Kalau deploy gagal,
  // registrasi ikut gagal dan user mengulang setup dari awal.
  await deployWallet((signedTx as { toXDR(): string }).toXDR());
  await verifyPasskeyRegister(rawResponse as RegistrationResponseJSON, contractId);
  return { keyIdBase64, contractId };
}
