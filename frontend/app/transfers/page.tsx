"use client";

import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { TransferHub } from "@/components/sender/transfer-hub";

export default function TransfersPage() {
  const router = useRouter();
  return <AppShell><div className="mx-auto max-w-2xl pb-12"><TransferHub onStartTransfer={() => router.push("/send")} showRecurring={false} /></div></AppShell>;
}
