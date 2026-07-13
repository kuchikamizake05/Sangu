"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { reportClientError } from "@/lib/client-observability";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { reportClientError("global-error", error); }, [error]);
  return <html lang="id"><body className="m-0 bg-[#fcfcfc] font-[Avenir_Next,Segoe_UI,sans-serif] text-[#080808]"><main className="mx-auto grid min-h-dvh max-w-md place-items-center p-6 text-center"><section><p className="text-xs font-extrabold tracking-[.15em] text-[#9e1d0e]">SANGU</p><h1 className="mt-3 text-4xl font-extrabold tracking-[-.06em]">Ada gangguan di aplikasi</h1><p className="mt-4 text-[#676767]">Data kirimanmu tetap aman. Silakan coba lagi beberapa saat lagi.</p><Button className="mt-8" onClick={reset}>Coba lagi</Button></section></main></body></html>;
}
