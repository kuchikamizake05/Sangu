"use client";
// App Pengirim (skeleton). TODO: passkey smart wallet (Spike 1), 4-layar kirim, riwayat, Sangu Bulanan.
import { useState } from "react";
import { getQuote, send, type Corridor, type Quote } from "@/lib/api";

export default function SenderPage() {
  const [corridor, setCorridor] = useState<Corridor>("MY");
  const [amount, setAmount] = useState("500");
  const [phone, setPhone] = useState("+628120000000");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [claimUrl, setClaimUrl] = useState<string | null>(null);

  async function refreshQuote() {
    setQuote(await getQuote(corridor, amount));
  }

  async function onSend() {
    const res = await send({ corridor, amountForeign: amount, recipientPhone: phone });
    setClaimUrl(res.claimUrl);
  }

  return (
    <main style={{ maxWidth: 420, margin: "0 auto", padding: 24 }}>
      <h1>Sangu</h1>
      <p style={{ opacity: 0.7 }}>Kirim pulang, semudah kirim pesan.</p>

      <label>Koridor</label>
      <select value={corridor} onChange={(e) => setCorridor(e.target.value as Corridor)}>
        <option value="MY">Malaysia (RM)</option>
        <option value="HK">Hong Kong (HKD)</option>
      </select>

      <div style={{ marginTop: 12 }}>
        <label>Jumlah</label>
        <input value={amount} onChange={(e) => setAmount(e.target.value)} onBlur={refreshQuote} />
      </div>

      <div style={{ marginTop: 12 }}>
        <label>Nomor penerima</label>
        <input value={phone} onChange={(e) => setPhone(e.target.value)} />
      </div>

      {quote && (
        <div style={{ marginTop: 16, padding: 12, background: "#141b33", borderRadius: 8 }}>
          <div>Penerima terima ± Rp {Number(quote.amountIdr).toLocaleString("id-ID")}</div>
          <div style={{ color: "#8bd18b" }}>Biaya kami: Rp {quote.feeIdr}</div>
          <div style={{ color: "#e08b8b" }}>
            Western Union: Rp {Number(quote.comparison.westernUnionFeeIdr).toLocaleString("id-ID")}
          </div>
        </div>
      )}

      <button style={{ marginTop: 16, width: "100%", padding: 12 }} onClick={onSend}>
        Kirim
      </button>

      {claimUrl && (
        <p style={{ marginTop: 16 }}>
          Link claim: <a href={claimUrl}>{claimUrl}</a> — bagikan ke WhatsApp.
        </p>
      )}
    </main>
  );
}
