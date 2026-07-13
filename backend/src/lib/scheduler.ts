// Scheduler (spec §4 tugas 7):
// 1) Keeper refund — memindai transfer PENDING yang lewat expiry lalu memanggil
//    escrow.refund (permissionless; dana HANYA balik ke sender, jadi aman diotomasi).
// 2) Sangu Bulanan — menandai jadwal yang jatuh tempo. Karena non-custodial, backend
//    TIDAK bisa auto-debit: trigger = tanda "siap kirim" (frontend/notifikasi meminta
//    pengirim sign passkey). Dicatat di roadmap.
import type { FastifyBaseLogger } from "fastify";
import {
  listExpiredPending,
  listAnchorAwaitingPayment,
  updateTransfer,
  listRecurringDue,
  markRecurringTriggered,
  recordTransferEvent,
} from "./db.js";
import { isOnchainEnabled, refund } from "../stellar/escrow.js";
import { isAnchorEnabled, getWithdrawInfo, payAnchorWithMemo } from "../anchor/sep24.js";

const KEEPER_INTERVAL_MS = Number(process.env.KEEPER_INTERVAL_MS ?? 30_000);
const RECURRING_INTERVAL_MS = 60 * 60 * 1000; // cek jam-jaman cukup untuk jadwal harian
const ANCHOR_POLL_INTERVAL_MS = Number(process.env.ANCHOR_POLL_INTERVAL_MS ?? 20_000);

let timers: NodeJS.Timeout[] = [];
let keeperBusy = false;
let anchorBusy = false;

async function keeperTick(log: FastifyBaseLogger) {
  if (keeperBusy) return; // jangan tumpuk bila tick sebelumnya masih jalan
  keeperBusy = true;
  try {
    const now = Math.floor(Date.now() / 1000);
    for (const t of await listExpiredPending(now)) {
      try {
        if (isOnchainEnabled() && t.escrowId && !t.escrowId.startsWith("SIM-")) {
          const { txHash } = await refund(t.escrowId);
          log.info({ transferId: t.transferId, txHash }, "keeper: refund on-chain sukses");
          await updateTransfer(t.transferId, { status: "REFUNDED" });
          await recordTransferEvent(t.transferId, "REFUNDED");
        } else {
          // demo-mode / belum sempat deposit on-chain
          await updateTransfer(t.transferId, { status: t.escrowId ? "REFUNDED" : "EXPIRED" });
          await recordTransferEvent(t.transferId, t.escrowId ? "REFUNDED" : "EXPIRED");
          log.info({ transferId: t.transferId }, "keeper: transfer expired (simulasi)");
        }
      } catch (err) {
        // biarkan tick berikutnya mencoba lagi — jangan hentikan loop karena satu kegagalan
        log.warn({ err, transferId: t.transferId }, "keeper: refund gagal, akan dicoba lagi");
      }
    }
  } finally {
    keeperBusy = false;
  }
}

// Poller SEP-24 (spec §4): anchor baru memberi akun tujuan + memo SETELAH penerima
// menyelesaikan interactive URL. Poller memantau withdrawal yang belum dibayar; begitu
// status pending_user_transfer_start (memo tersedia), bayar Classic ber-memo dari
// settlement — tepat sekali (anchorPaymentTxHash non-null mengeluarkannya dari daftar).
async function anchorTick(log: FastifyBaseLogger) {
  if (anchorBusy || !isAnchorEnabled()) return;
  anchorBusy = true;
  try {
    for (const t of await listAnchorAwaitingPayment()) {
      try {
        const info = await getWithdrawInfo(t.anchorTxId!);
        if (info.status !== t.anchorStatus) {
          await updateTransfer(t.transferId, { anchorStatus: info.status });
        }
        if (info.withdrawAnchorAccount && info.withdrawMemo) {
          const { txHash } = await payAnchorWithMemo(
            info.withdrawAnchorAccount,
            t.anchorAmountUsdc ?? (Number(t.amountUsdcStroops) / 1e7).toFixed(2),
            info.withdrawMemo,
            info.withdrawMemoType,
          );
          await updateTransfer(t.transferId, { anchorPaymentTxHash: txHash });
          log.info(
            { transferId: t.transferId, anchorTxId: t.anchorTxId, txHash },
            "anchor poller: pembayaran memo ke anchor terkirim",
          );
        }
      } catch (err) {
        // biarkan tick berikutnya mencoba lagi — jangan hentikan loop karena satu kegagalan
        log.warn({ err, transferId: t.transferId }, "anchor poller: gagal, akan dicoba lagi");
      }
    }
  } finally {
    anchorBusy = false;
  }
}

async function recurringTick(log: FastifyBaseLogger) {
  const now = Math.floor(Date.now() / 1000);
  const today = new Date().getDate();
  for (const r of await listRecurringDue(today, now)) {
    await markRecurringTriggered(r.recurringId, now);
    // Non-custodial: tidak bisa auto-sign — cukup tandai jatuh tempo (frontend menampilkan
    // "Sangu Bulanan siap dikirim"; kanal notifikasi = roadmap).
    log.info(
      { recurringId: r.recurringId, corridor: r.corridor, amountForeign: r.amountForeign },
      "Sangu Bulanan jatuh tempo — menunggu sign passkey pengirim"
    );
  }
}

export function startScheduler(log: FastifyBaseLogger) {
  timers.push(setInterval(() => void keeperTick(log), KEEPER_INTERVAL_MS));
  timers.push(setInterval(() => void recurringTick(log), RECURRING_INTERVAL_MS));
  timers.push(setInterval(() => void anchorTick(log), ANCHOR_POLL_INTERVAL_MS));
  log.info(
    { keeperIntervalMs: KEEPER_INTERVAL_MS, anchorPollIntervalMs: ANCHOR_POLL_INTERVAL_MS },
    "scheduler aktif (keeper refund + poller anchor SEP-24 + Sangu Bulanan)"
  );
}

export function stopScheduler() {
  for (const t of timers) clearInterval(t);
  timers = [];
}
