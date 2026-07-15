# backend/ — REST API + Relayer + Anchor bridge (Node/TS)

Owner: tim **Backend**.

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

## Tugas utama
1. REST API lengkap + DB (mapping token↔escrow, secret, status, riwayat, jadwal).
2. Relayer: susun & fee-bump tx `deposit`/`claim`/`refund`, baca event.
3. OTP flow (Twilio Verify / mock) + lookup nomor via **HMAC commitment** (bukan sha256 tebakan).
4. Jembatan **SEP-24 → SDF Test Anchor** (SEP-10 auth → interactive → bayar ber-memo).
5. Scheduler Sangu Bulanan + keeper `refund` saat expiry.

## Auth pengirim (`/api/auth/*`)
OTP hanya untuk daftar/recovery; login harian via passkey (WebAuthn). Semua route
sender (kecuali `GET /api/quote`) butuh `Authorization: Bearer <JWT>` dan ter-scope
ke `senderId`. Mode dev/demo: `OTP_PROVIDER=mock` → kode OTP selalu `000000`.

Env tambahan (semua punya default dev — WAJIB diisi untuk produksi):

| Var | Fungsi | Default dev |
|---|---|---|
| `AUTH_JWT_SECRET` | secret JWT session 30 hari | `sangu-dev-jwt-secret` (warning saat start) |
| `PHONE_HMAC_KEY` | HMAC lookup nomor HP di tabel `senders` | `sangu-dev-phone-hmac` |
| `AUTH_RP_ID` | rpID WebAuthn (domain frontend tanpa skema) | `localhost` |
| `AUTH_ORIGIN` | origin frontend untuk verifikasi WebAuthn | `http://localhost:3000` |
| `RECURRING_INTERVAL_MS` | interval cek jadwal Sangu Bulanan (percepat untuk demo `dueNow`) | 1 jam |

## Catatan penting
- **secret** dibuat & disimpan backend (`src/stellar/escrow.ts#newSecret`), **tidak** di URL.
- Link claim hanya membawa **token opaque**.
- `payout_destination` untuk `claim` = **akun settlement** yang di-allowlist di contract
  (wrinkle memo SEP-24).
