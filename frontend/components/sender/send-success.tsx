"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircleIcon } from "@/components/ui/icons";
import styles from "./send-success.module.css";

export function SendSuccess({
  amountLabel,
  recipientPhone,
  claimUrl,
  onBackHome,
}: {
  amountLabel: string;
  recipientPhone: string;
  claimUrl: string;
  onBackHome: () => void;
}) {
  const [notice, setNotice] = useState<string | null>(null);

  async function share() {
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

  return (
    <div className="flex min-h-[70dvh] flex-col items-center justify-center gap-6 px-6 text-center">
      <span className={`flex size-20 items-center justify-center rounded-full bg-success-wash text-success ${styles.pop}`}>
        <CheckCircleIcon className="size-12" />
      </span>
      <div>
        <p className="text-xs font-extrabold tracking-[.15em] text-brand-deep">TERKIRIM</p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-[-.05em]">Terkirim!</h1>
        <p className="mt-2 text-base text-muted">{amountLabel} → {recipientPhone}</p>
      </div>
      <div className="grid w-full max-w-xs gap-3">
        <Button fullWidth onClick={share}>Bagikan link ke WhatsApp</Button>
        <Button fullWidth variant="ghost" onClick={onBackHome}>Kembali ke Beranda</Button>
      </div>
      {notice && <p className="text-sm text-muted" role="status">{notice}</p>}
    </div>
  );
}
