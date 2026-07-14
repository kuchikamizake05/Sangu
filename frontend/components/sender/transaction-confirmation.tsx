"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { submitSend } from "@/lib/api";
import { signWithPasskey } from "@/lib/passkey-wallet";

type Stage = "idle" | "signing" | "submitting" | "done";

export function TransactionConfirmation({
  transferId,
  unsignedXDR,
  onDone,
}: {
  transferId: string;
  unsignedXDR: string;
  onDone?: (claimUrl: string) => void;
}) {
  const [stage, setStage] = useState<Stage>("idle");
  const [claimUrl, setClaimUrl] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function confirm() {
    setNotice(null);
    setStage("signing");
    try {
      const signedXDR = await signWithPasskey(unsignedXDR);
      setStage("submitting");
      const receipt = await submitSend({ transferId, signedXDR });
      setClaimUrl(receipt.claimUrl);
      setStage("done");
      onDone?.(receipt.claimUrl);
    } catch (error) {
      setStage("idle");
      setNotice(error instanceof Error ? error.message : "Konfirmasi belum berhasil. Coba lagi.");
    }
  }

  async function share() {
    if (!claimUrl) return;
    const payload = { title: "Sangu", text: "Aku mengirim uang untukmu. Buka link ini untuk mencairkan.", url: claimUrl };
    try {
      if (navigator.share) await navigator.share(payload);
      else {
        await navigator.clipboard.writeText(claimUrl);
        setNotice("Link claim sudah disalin.");
      }
    } catch {
      setNotice("Link claim belum dibagikan. Kamu bisa menyalinnya di bawah.");
    }
  }

  if (stage === "done" && claimUrl) {
    return (
      <div className="rounded-3xl bg-ink p-5 text-white">
        <p className="text-xs font-extrabold tracking-[.15em] text-peach">TRANSFER TERKIRIM</p>
        <h2 className="mt-2 text-2xl font-extrabold tracking-[-.05em]">Bagikan link ke keluarga</h2>
        <p className="mt-2 text-sm text-white/70">Penerima cukup membuka link ini dan memverifikasi OTP untuk mencairkan.</p>
        <a className="mt-4 block break-all rounded-2xl bg-white/10 p-3 text-sm font-semibold underline" href={claimUrl}>{claimUrl}</a>
        <Button className="mt-4" fullWidth onClick={share}>Bagikan via WhatsApp</Button>
        {notice && <p className="mt-3 text-sm text-peach" role="status">{notice}</p>}
      </div>
    );
  }

  const label = stage === "signing" ? "Menunggu sidik jari…" : stage === "submitting" ? "Mengirim transaksi…" : "Konfirmasi dengan sidik jari";

  return (
    <div>
      <Button fullWidth onClick={confirm} disabled={stage !== "idle"}>{label}</Button>
      {notice && (
        <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl bg-danger-wash p-3 text-sm font-semibold text-danger" role="alert">
          <span>{notice}</span>
          <button type="button" className="shrink-0 font-extrabold underline" onClick={confirm}>Coba lagi</button>
        </div>
      )}
    </div>
  );
}
