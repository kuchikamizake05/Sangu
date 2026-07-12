# frontend/ — App Pengirim + Halaman Claim (Next.js)

Owner: tim **Frontend**. Konsumsi REST backend (spec §2.3). Frontend **tidak** menyimpan
secret/relayer key.

## Jalankan
```bash
cd frontend
npm install
NEXT_PUBLIC_API_URL=http://localhost:4000 npm run dev   # http://localhost:3000
```

## Permukaan
- `app/page.tsx` — **App Pengirim** (koridor MY/HK, jumlah, transparansi biaya kurs live, kirim → link).
- `app/claim/[token]/page.tsx` — **Halaman Claim** penerima (tanpa app, pilih cair, cash-out).

## TODO (spec §5)
- [ ] **passkey smart wallet** onboarding (Spike 1) + login biometrik non-custodial.
- [ ] Isi saldo (mock on-ramp).
- [ ] Alur kirim 4 layar + Share WhatsApp.
- [ ] Riwayat + **Sangu Bulanan**.
- [ ] Claim: **OTP** request/verify sebelum payout; fallback SMS.
- [ ] Rapikan UI: **Tailwind + shadcn/ui**, i18n Bahasa Indonesia, number-formatting.

> Skeleton ini pakai inline style biar langsung jalan. Ganti ke Tailwind + shadcn saat mulai UI.
