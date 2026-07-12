"use client";
// Halaman Claim penerima (skeleton) — TANPA app. TODO: OTP request/verify, fallback SMS.
// Prinsip: tombol besar, teks minim, Bahasa Indonesia, jalan di HP murah.
import { use, useEffect, useState } from "react";
import { getClaim, payout, type PayoutMethod } from "@/lib/api";

export default function ClaimPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [info, setInfo] = useState<any>(null);
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    getClaim(token).then(setInfo);
  }, [token]);

  async function cair(method: PayoutMethod) {
    // TODO: OTP dulu sebelum payout
    setResult(await payout(token, method));
  }

  if (!info) return <main style={{ padding: 24 }}>Memuat…</main>;

  return (
    <main style={{ maxWidth: 420, margin: "0 auto", padding: 24, textAlign: "center" }}>
      <p style={{ fontSize: 18 }}>{info.senderName} mengirimimu</p>
      <h1 style={{ fontSize: 40 }}>Rp {Number(info.amountIdr).toLocaleString("id-ID")}</h1>

      {!result ? (
        <>
          <p style={{ opacity: 0.7 }}>Pilih cara mencairkan:</p>
          <Btn onClick={() => cair("dana")}>DANA</Btn>
          <Btn onClick={() => cair("gopay")}>GoPay</Btn>
          <Btn onClick={() => cair("bank")}>Transfer Bank</Btn>
          <Btn onClick={() => cair("cash")}>⭐ Tunai di Gerai</Btn>
        </>
      ) : (
        <div style={{ marginTop: 24, padding: 16, background: "#141b33", borderRadius: 8 }}>
          {result.cashCode ? (
            <>
              <p>Tunjukkan kode ini di gerai:</p>
              <h2>{result.cashCode}</h2>
              <p style={{ opacity: 0.7 }}>{result.instructions}</p>
            </>
          ) : (
            <p>{result.instructions}</p>
          )}
          {result.simulatedPayout && (
            <p style={{ fontSize: 11, opacity: 0.6, marginTop: 8 }}>
              Demo: withdrawal SEP-24 nyata; settlement IDR/tunai disimulasikan di layer anchor.
            </p>
          )}
        </div>
      )}
    </main>
  );
}

function Btn({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{ display: "block", width: "100%", padding: 16, margin: "10px 0", fontSize: 18 }}>
      {children}
    </button>
  );
}
