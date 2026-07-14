// Rute saldo dompet pengirim (fitur saldo demo).
//
// Saldo = USDC di smart wallet pengirim (non-custodial). Untuk demo/hackathon, on-ramp
// di-MOCK: "Isi saldo" (POST /api/wallet/topup) mengkredit saldo demo tersimpan di DB —
// backend TIDAK memegang dana nyata pengguna.
//
// AUTH: semua route di sini butuh Bearer JWT — sender di-scope dari req.user.senderId
// (pola sama dengan routes/sender.ts).
import type { FastifyInstance } from "fastify";
import { foreignToUsdRate, getQuote } from "../lib/fx.js";
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

const CURRENCY_BY_CORRIDOR: Record<Corridor, "MYR" | "HKD"> = { MY: "MYR", HK: "HKD" };

/** corridor sender; sender belum punya corridor tersimpan → default MY (MYR). */
function senderCorridor(corridor: "MY" | "HK" | null | undefined): Corridor {
  return corridor === "HK" ? "HK" : "MY";
}

/** Konversi stroops USDC (7 desimal) → nominal mata uang koridor (string 2 desimal). */
async function usdcStroopsToForeign(corridor: Corridor, stroops: bigint): Promise<string> {
  const usd = Number(stroops) / 1e7;
  const rate = await foreignToUsdRate(corridor); // 1 foreign = rate USD
  return (usd / rate).toFixed(2);
}

// Bangun respons saldo (bentuk sama untuk GET /balance & POST /topup) dari saldo tersimpan.
async function buildBalanceResponse(
  corridor: Corridor,
  balanceForeign: string,
  source: "onchain" | "demo",
): Promise<WalletBalanceResponse> {
  const amt = Number(balanceForeign);
  // getQuote butuh amount > 0 (dipakai juga utk hitung rate); saldo 0 tetap kita kuotasi
  // dgn amount kecil nonzero utk ambil rate, lalu nolkan hasilnya — hindari div/edge-case FX API.
  const quote = await getQuote(corridor, amt > 0 ? amt : 1);
  const idrEstimate = amt > 0 ? quote.amountIdr : "0";

  return {
    currency: CURRENCY_BY_CORRIDOR[corridor],
    amount: amt.toFixed(2),
    idrEstimate,
    source,
  };
}

export default async function walletRoutes(app: FastifyInstance) {
  const authed = { preHandler: [app.authenticate] };

  app.get("/api/wallet/balance", authed, async (req): Promise<unknown> => {
    const sender = await getSenderById(req.user.senderId);
    const corridor = senderCorridor(sender?.corridor);

    // Mode on-chain + wallet ter-deploy: saldo = USDC sungguhan di smart wallet.
    // Gagal baca (RPC down, dsb.) → fallback saldo demo supaya home tetap hidup.
    if (isOnchainEnabled() && sender?.walletAddress) {
      try {
        const balanceForeign = await usdcStroopsToForeign(corridor, await getUsdcBalanceStroops(sender.walletAddress));
        return buildBalanceResponse(corridor, balanceForeign, "onchain");
      } catch (err) {
        req.log.warn({ err }, "baca saldo on-chain gagal — fallback demo");
      }
    }

    const record = await getOrCreateWalletBalance(req.user.senderId, corridor);
    return buildBalanceResponse(corridor, record.balanceForeign, "demo");
  });

  app.post("/api/wallet/topup", authed, async (req, reply): Promise<unknown> => {
    const body = req.body as { amountForeign: string };
    const amt = Number(body.amountForeign);
    if (!Number.isFinite(amt) || amt <= 0) return badRequest(reply, "amountForeign tidak valid");
    if (amt > MAX_TOPUP) return badRequest(reply, `amountForeign maksimum ${MAX_TOPUP}`);

    const sender = await getSenderById(req.user.senderId);
    const corridor = senderCorridor(sender?.corridor);

    // Mode on-chain + wallet ter-deploy: on-ramp MOCK-tapi-on-chain — treasury (akun
    // settlement) mengirim USDC testnet sungguhan ke smart wallet sender (docs §14.7).
    if (isOnchainEnabled() && sender?.walletAddress) {
      try {
        const quote = await getQuote(corridor, amt);
        await transferUsdcFromTreasury(sender.walletAddress, BigInt(quote.usdcStroops));
        const balanceForeign = await usdcStroopsToForeign(corridor, await getUsdcBalanceStroops(sender.walletAddress));
        return buildBalanceResponse(corridor, balanceForeign, "onchain");
      } catch (err) {
        req.log.error({ err }, "top-up on-chain gagal");
        reply.code(502);
        return {
          error: {
            code: "TOPUP_FAILED",
            message: "Isi saldo on-chain gagal — treasury demo mungkin kehabisan USDC testnet.",
          },
        };
      }
    }

    const current = await getOrCreateWalletBalance(req.user.senderId, corridor);
    const newBalance = (Number(current.balanceForeign) + amt).toFixed(2);
    await setWalletBalance(req.user.senderId, corridor, newBalance);

    return buildBalanceResponse(corridor, newBalance, "demo");
  });

  // Setup pertama passkey: submit tx deploy smart wallet (ditandatangani passkey-kit di
  // frontend) via fee-bump relayer. Mode demo (on-chain off) → no-op supaya flow register
  // tetap jalan tanpa jaringan.
  app.post("/api/wallet/deploy", authed, async (req, reply): Promise<unknown> => {
    const body = req.body as { signedTx?: string };
    if (typeof body?.signedTx !== "string" || body.signedTx.length === 0) {
      reply.code(400);
      return { error: { code: "INVALID_SIGNED_TX", message: "signedTx (XDR base64) wajib diisi" } };
    }

    if (!isOnchainEnabled()) return { submitted: false, txHash: null };

    try {
      const { txHash } = await submitWalletDeploy(body.signedTx);
      return { submitted: true, txHash };
    } catch (err) {
      req.log.error({ err }, "deploy smart wallet gagal");
      reply.code(502);
      return { error: { code: "DEPLOY_FAILED", message: "Deploy smart wallet gagal. Coba lagi." } };
    }
  });
}
