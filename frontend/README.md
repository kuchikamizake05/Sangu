# frontend/ — App Pengirim + Halaman Claim (Next.js)

Owner: tim **Frontend**. Konsumsi REST backend. Frontend **tidak** menyimpan
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

## TODO
- [ ] **passkey smart wallet** onboarding (Spike 1) + login biometrik non-custodial.
- [ ] Isi saldo (mock on-ramp).
- [ ] Alur kirim 4 layar + Share WhatsApp.
- [ ] Riwayat + **Sangu Bulanan**.
- [ ] Claim: **OTP** request/verify sebelum payout; fallback SMS.
- [ ] Rapikan UI: **Tailwind + shadcn/ui**, i18n Bahasa Indonesia, number-formatting.

> Fase awal UI kini memakai Tailwind + CSS Modules untuk primitive reusable. shadcn/ui dapat ditambahkan saat komponen aplikasinya mulai bertambah.

## Konfigurasi Phase 3 (passkey)

Signing browser memerlukan `NEXT_PUBLIC_STELLAR_RPC_URL`,
`NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE`, dan `NEXT_PUBLIC_SMART_WALLET_WASM_HASH`.
Frontend hanya menerima unsigned/signed XDR; jangan pernah menaruh private key, secret transfer,
atau credential relayer di variabel `NEXT_PUBLIC_*`.

Backend harus menyediakan `POST /api/send/submit` dengan body `{ transferId, signedXDR }`.
Sebelum production launch, selaraskan backend dari plain XDR ke `AssembledTransaction` agar dapat
migrasi ke `smart-account-kit` berbasis OpenZeppelin Smart Accounts.
