# backend/ — REST API + Relayer + Anchor bridge (Node/TS)

Owner: tim **Backend**. Interface = `docs/spesifikasi-teknis-pembagian-kerja.md` §2.3.

## Jalankan
```bash
cd backend
cp ../.env.example .env   # isi seperlunya
npm install
npm run dev               # http://localhost:4000  (GET /health)
```

## Status implementasi (skeleton)
| Bagian | State | Catatan |
|---|---|---|
| `GET /api/quote` | ✅ real | kurs live via FX API (`src/lib/fx.ts`) |
| `POST /api/send` | 🟡 stub | bentuk benar; `escrow.deposit` = TODO (Spike 1) |
| `POST /api/claim/:token/payout` | 🟡 stub | SEP-24 + `escrow.claim` = TODO (Spike 3) |
| `/otp/*`, `/transfers`, `/recurring` | 🟡 stub | sambungkan OTP + DB |
| relayer / keeper refund | ⬜ TODO | fee-bump + scheduler |

## Tugas utama (spec §4)
1. REST API lengkap + DB (mapping token↔escrow, secret, status, riwayat, jadwal).
2. Relayer: susun & fee-bump tx `deposit`/`claim`/`refund`, baca event.
3. OTP flow (Twilio Verify / mock) + cocokkan `phone_hash`.
4. Jembatan **SEP-24 → SDF Test Anchor** (SEP-10 auth → interactive → bayar ber-memo).
5. Scheduler Sangu Bulanan + keeper `refund` saat expiry.

## Catatan penting
- **secret** dibuat & disimpan backend (`src/stellar/escrow.ts#newSecret`), **tidak** di URL.
- Link claim hanya membawa **token opaque**.
- `payout_destination` untuk `claim` = **akun settlement** yang di-allowlist di contract
  (wrinkle memo SEP-24, spec §4).
