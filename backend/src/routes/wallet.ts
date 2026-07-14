// Rute saldo dompet pengirim (fitur saldo demo).
//
// Saldo = USDC di smart wallet pengirim (non-custodial). Untuk demo/hackathon, on-ramp
// di-MOCK: "Isi saldo" (POST /api/wallet/topup) mengkredit saldo demo tersimpan di DB —
// backend TIDAK memegang dana nyata pengguna.
//
// AUTH: semua route di sini butuh Bearer JWT — sender di-scope dari req.user.senderId
// (pola sama dengan routes/sender.ts).
import type { FastifyInstance } from "fastify";
import { foreignToUsdRate, ratesFromUsd } from "../lib/fx.js";
import { getSenderById, getOrCreateWalletBalance, setWalletBalance } from "../lib/db.js";
import {
  getUsdcBalanceStroops,
  isOnchainEnabled,
  submitWalletDeploy,
  transferUsdcFromTreasury,
} from "../stellar/escrow.js";
import type { Corridor, WalletBalanceResponse } from "../lib/types.js";

const MAX_TOPUP = 50_000;

function badRequest(reply: { code: (n: number) => unknown }, message: string) {
  reply.code(400);
  return { error: { code: "INVALID_AMOUNT", message } };
}

/** corridor sender; sender belum punya corridor tersimpan → default MY (MYR). */
function senderCorridor(corridor: "MY" | "HK" | null | undefined): Corridor {
  return corridor === "HK" ? "HK" : "MY";
}

// Mata uang TAMPILAN saldo — bebas dipilih pengguna (wallet sendiri berisi dolar digital,
// jadi USD = nilai apa adanya). Default USD supaya netral untuk pekerja dari negara mana pun.
const DISPLAY_CURRENCIES = ["USD", "MYR", "HKD"] as const;
type DisplayCurrency = (typeof DISPLAY_CURRENCIES)[number];

function parseDisplayCurrency(value: unknown): DisplayCurrency {
  return DISPLAY_CURRENCIES.includes(value as DisplayCurrency) ? (value as DisplayCurrency) : "USD";
}

// Bangun respons saldo (bentuk sama untuk GET /balance & POST /topup) dari saldo USD.
async function buildBalanceResponse(
  currency: DisplayCurrency,
  balanceUsd: number,
  source: "onchain" | "demo",
): Promise<WalletBalanceResponse> {
  const rates = await ratesFromUsd();
  const factor = currency === "USD" ? 1 : rates[currency];
  return {
    currency,
    amount: (balanceUsd * factor).toFixed(2),
    idrEstimate: Math.round(balanceUsd * rates.IDR).toString(),
    source,
  };
}

export default async function walletRoutes(app: FastifyInstance) {
  const authed = { preHandler: [app.authenticate] };

  app.get("/api/wallet/balance", authed, async (req, reply): Promise<unknown> => {
    const currency = parseDisplayCurrency((req.query as { currency?: string }).currency);
    const sender = await getSenderById(req.user.senderId);
    const corridor = senderCorridor(sender?.corridor);

    // Mode on-chain + wallet ter-deploy: saldo = USDC sungguhan di smart wallet.
    // Gagal baca (RPC down, dsb.) → error eksplisit, JANGAN tampilkan saldo demo:
    // angka demo bisa beda dari isi wallet asli dan menyesatkan pengguna.
    if (isOnchainEnabled() && sender?.walletAddress) {
      try {
        const balanceUsd = Number(await getUsdcBalanceStroops(sender.walletAddress)) / 1e7;
        return await buildBalanceResponse(currency, balanceUsd, "onchain");
      } catch (err) {
        req.log.warn({ err }, "baca saldo on-chain gagal");
        reply.code(502);
        return {
          error: { code: "BALANCE_UNAVAILABLE", message: "Saldo belum dapat dimuat. Coba beberapa saat lagi." },
        };
      }
    }

    // Saldo demo tersimpan dalam mata uang koridor — konversi dulu ke USD.
    const record = await getOrCreateWalletBalance(req.user.senderId, corridor);
    const balanceUsd = Number(record.balanceForeign) * (await foreignToUsdRate(corridor));
    return buildBalanceResponse(currency, balanceUsd, "demo");
  });

  app.post("/api/wallet/topup", authed, async (req, reply): Promise<unknown> => {
    const body = req.body as { amountForeign: string; currency?: string };
    const currency = parseDisplayCurrency(body.currency);
    const amt = Number(body.amountForeign);
    if (!Number.isFinite(amt) || amt <= 0) return badRequest(reply, "Nominal isi saldo tidak valid.");
    if (amt > MAX_TOPUP) return badRequest(reply, `Maksimum isi saldo ${MAX_TOPUP.toLocaleString("id-ID")}.`);

    const sender = await getSenderById(req.user.senderId);
    const corridor = senderCorridor(sender?.corridor);

    // Nominal top-up dalam mata uang tampilan → USD.
    const rates = await ratesFromUsd();
    const amountUsd = currency === "USD" ? amt : amt / rates[currency];

    // Mode on-chain + wallet ter-deploy: on-ramp MOCK-tapi-on-chain — treasury (akun
    // settlement) mengirim USDC testnet sungguhan ke smart wallet sender (docs §14.7).
    if (isOnchainEnabled() && sender?.walletAddress) {
      try {
        await transferUsdcFromTreasury(sender.walletAddress, BigInt(Math.round(amountUsd * 1e7)));
        const balanceUsd = Number(await getUsdcBalanceStroops(sender.walletAddress)) / 1e7;
        return await buildBalanceResponse(currency, balanceUsd, "onchain");
      } catch (err) {
        req.log.error({ err }, "top-up on-chain gagal");
        reply.code(502);
        return {
          error: {
            code: "TOPUP_FAILED",
            message: "Isi saldo belum berhasil. Coba beberapa saat lagi.",
          },
        };
      }
    }

    // On-chain aktif tapi wallet belum ada: JANGAN kredit saldo demo — angka itu tidak
    // pernah masuk wallet asli dan bikin saldo tampak lebih besar dari kenyataan.
    if (isOnchainEnabled()) {
      reply.code(409);
      return {
        error: {
          code: "WALLET_NOT_ACTIVE",
          message: "Aktifkan sidik jari dulu di halaman Akun, baru saldomu bisa diisi dan tersimpan aman.",
        },
      };
    }

    // Mode demo penuh: saldo DB tersimpan dalam mata uang koridor — konversi USD → koridor.
    const corridorRate = await foreignToUsdRate(corridor); // 1 foreign = rate USD
    const current = await getOrCreateWalletBalance(req.user.senderId, corridor);
    const newBalance = (Number(current.balanceForeign) + amountUsd / corridorRate).toFixed(2);
    await setWalletBalance(req.user.senderId, corridor, newBalance);

    const balanceUsd = Number(newBalance) * corridorRate;
    return buildBalanceResponse(currency, balanceUsd, "demo");
  });

  // Setup pertama passkey: submit tx deploy smart wallet (ditandatangani passkey-kit di
  // frontend) via fee-bump relayer. Mode demo (on-chain off) → no-op supaya flow register
  // tetap jalan tanpa jaringan.
  app.post("/api/wallet/deploy", authed, async (req, reply): Promise<unknown> => {
    const body = req.body as { signedTx?: string };
    if (typeof body?.signedTx !== "string" || body.signedTx.length === 0) {
      reply.code(400);
      return { error: { code: "INVALID_SIGNED_TX", message: "Data konfirmasi tidak lengkap. Coba lagi." } };
    }

    if (!isOnchainEnabled()) return { submitted: false, txHash: null };

    try {
      const { txHash } = await submitWalletDeploy(body.signedTx);
      return { submitted: true, txHash };
    } catch (err) {
      req.log.error({ err }, "deploy smart wallet gagal");
      reply.code(502);
      return { error: { code: "DEPLOY_FAILED", message: "Aktivasi keamanan belum berhasil. Coba lagi." } };
    }
  });
}
