# Sangu — Remittance PMI di Stellar

> Kirim uang pulang semudah kirim pesan. Penerima cairkan tanpa app, tanpa rekening —
> bahkan bisa **tarik tunai**. Wallet pengirim & escrow **non-custodial** (off-ramp trusted),
> di atas **Stellar / Soroban**.
>
> Untuk **Stellar APAC Hackathon** — track **Payment & Consumer Applications**.

## Dokumen

- [`docs/konsep-produk-remittance-pmi.md`](docs/konsep-produk-remittance-pmi.md) — ide, pasar, UX, arsitektur, "kenapa Stellar".
- [`docs/spesifikasi-teknis-pembagian-kerja.md`](docs/spesifikasi-teknis-pembagian-kerja.md) — **interface bersama (source of truth)**, pembagian kerja per departemen, spike hari-1, DoD.

## Struktur

```
contracts/   Soroban escrow contract (Rust)          → tim Smart Contract
backend/     REST API + relayer + anchor bridge (TS)  → tim Backend
frontend/    App pengirim + halaman claim (Next.js)   → tim Frontend
docs/        Konsep produk + spesifikasi teknis
.env.example Variabel bersama
```

## Alur inti

`deposit` (passkey wallet) → link WhatsApp → penerima buka link → OTP → `claim` →
SEP-24 withdraw (e-wallet/tunai). Expiry lewat → `refund` (keeper).

## Mulai (per package)

- **contracts:** `cd contracts && stellar contract build` — lihat [`contracts/README.md`](contracts/README.md)
- **backend:** `cd backend && npm i && npm run dev` — lihat [`backend/README.md`](backend/README.md)
- **frontend:** `cd frontend && npm i && npm run dev` — lihat [`frontend/README.md`](frontend/README.md)

## ⚠️ Sebelum bangun penuh — kerjakan **Spike Hari-1** (docs spec §7)

1. Passkey smart wallet meng-`require_auth` `deposit` di testnet.
2. Kecocokan aset escrow ↔ aset withdraw SDF Test Anchor.
3. Satu SEP-24 withdraw sukses ke SDF Test Anchor (settlement account + memo).

Spike dulu → baru scale. Interface di `docs/spesifikasi-teknis-pembagian-kerja.md` §2
**jangan diubah sepihak**.
