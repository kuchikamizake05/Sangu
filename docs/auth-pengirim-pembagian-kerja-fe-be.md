# Auth Pengirim — Pembagian Kerja FE / BE

> Status: disepakati 2026-07-13. BE dikerjakan Wangsit, FE dikerjakan tim frontend, paralel.
> Prinsip produk (track consumer apps): **user tidak boleh melihat kosakata crypto** —
> tidak ada kata wallet, address, sign, XDR, atau seed phrase di UI. Yang user lihat:
> nomor HP, OTP (sekali saat daftar), dan "konfirmasi dengan sidik jari / Face ID".

---

## 1. Model auth (ringkasan keputusan)

| Momen | Mekanisme | Frekuensi |
|---|---|---|
| Daftar / perangkat baru | Nomor HP + OTP SMS → buat passkey → terbit session JWT | Sekali per device |
| Buka aplikasi sehari-hari | Session JWT masih hidup (30 hari) → langsung masuk | Tanpa interaksi |
| Session habis / logout | "Masuk dengan sidik jari" = WebAuthn assertion passkey → JWT baru | Satu sentuhan, tanpa SMS |
| Ganti HP / passkey hilang | Ulangi jalur OTP (recovery) | Jarang |
| Konfirmasi transfer | Passkey menandatangani XDR (sudah ada di alur send) | Tiap transfer |

Satu passkey dipakai untuk **dua hal**: (a) assertion login, (b) tanda tangan XDR
smart-wallet (non-custodial). Di UI keduanya tampil sebagai "sidik jari" saja.

Peran OTP: **hanya** membuktikan kepemilikan nomor HP saat pendaftaran/recovery.
Bukan gerbang login harian.

---

## 2. Kontrak API (sumber kebenaran — jangan diubah sepihak)

Base URL, format error, dan konvensi respons mengikuti backend yang ada:
error selalu `{ error: { code: string, message: string } }` dengan HTTP status yang sesuai
(lihat pola di `backend/src/routes/claim.ts`).

Semua endpoint auth di bawah prefix `/api/auth`.

### 2.1 Pendaftaran & recovery (OTP)

```
POST /api/auth/otp/request
  body    : { phone: string }                 // E.164, contoh "+6281234567890"
  200     : { sent: true }
  429     : { error: { code: "OTP_RATE_LIMITED", message } }   // max 3/menit per nomor

POST /api/auth/otp/verify
  body    : { phone: string, code: string, name?: string }
  200     : { token: string,                  // JWT session, TTL 30 hari
              sender: { senderId: string, name: string, phoneMasked: string,
                        hasPasskey: boolean } }
  401     : { error: { code: "OTP_INVALID", message } }
  Catatan : idempoten terhadap pendaftaran — kalau nomor belum terdaftar, buat
            sender baru (name wajib saat pertama); kalau sudah ada, ini = recovery/login.
```

### 2.2 Passkey (registrasi credential & login harian)

WebAuthn standar. FE memakai `navigator.credentials` (atau passkey-kit yang sudah
dipakai untuk smart wallet — credential yang SAMA). BE memverifikasi via
`@simplewebauthn/server`.

```
POST /api/auth/passkey/register/options      // butuh Bearer JWT
  200     : PublicKeyCredentialCreationOptions (challenge dsb.)

POST /api/auth/passkey/register/verify       // butuh Bearer JWT
  body    : { attestation: <hasil navigator.credentials.create>,
              walletAddress: string }        // alamat smart wallet dari passkey-kit
  200     : { ok: true }
  400     : { error: { code: "PASSKEY_INVALID", message } }

POST /api/auth/passkey/login/options
  body    : { phone: string }                // untuk lookup credential
  200     : PublicKeyCredentialRequestOptions
  404     : { error: { code: "SENDER_NOT_FOUND", message } }

POST /api/auth/passkey/login/verify
  body    : { phone: string, assertion: <hasil navigator.credentials.get> }
  200     : { token: string, sender: { ...sama seperti 2.1 } }
  401     : { error: { code: "PASSKEY_INVALID", message } }
```

### 2.3 Sesi

```
GET /api/auth/me                             // butuh Bearer JWT
  200     : { senderId, name, phoneMasked, hasPasskey, walletAddress: string | null }
  401     : { error: { code: "UNAUTHORIZED", message } }
```

Logout = FE menghapus token lokal; tidak ada endpoint (JWT stateless untuk MVP).

### 2.4 Perubahan endpoint LAMA (breaking — FE wajib menyesuaikan)

Semua route pengirim di `sender.ts` kini **butuh header `Authorization: Bearer <JWT>`**
dan datanya ter-scope ke sender pemilik token:

- `GET /api/transfers`, `GET /api/transfers/:id`
- `POST /api/send/prepare`, `POST /api/send/submit`
- Semua `/api/recurring*`

Tanpa/invalid token → `401 { error: { code: "UNAUTHORIZED", message } }`.
`GET /api/quote` dan seluruh `/api/claim/*` **tetap publik** (penerima tanpa akun).

`POST /api/send/prepare`: field `senderAddress` di body **dihapus** — BE mengambilnya
dari profil sender (hasil passkey register). `senderName` di link claim otomatis
terisi nama sender.

---

## 3. Pekerjaan BACKEND (Wangsit)

### 3.1 Skema DB (tambahan di `SCHEMA_SQL`, idempoten seperti pola yang ada)

```sql
CREATE TABLE IF NOT EXISTS senders (
  "senderId"            TEXT PRIMARY KEY,
  "phoneHmac"           TEXT UNIQUE NOT NULL,  -- HMAC-SHA256(PHONE_HMAC_KEY, phoneE164); pola §2.2 spek utama
  "phoneE164"           TEXT NOT NULL,         -- perlu plaintext utk kirim OTP; masked saat keluar API
  "name"                TEXT NOT NULL,
  "passkeyCredentialId" TEXT,                  -- null sampai passkey terdaftar
  "passkeyPublicKey"    TEXT,
  "passkeyCounter"      BIGINT DEFAULT 0,
  "walletAddress"       TEXT,                  -- alamat smart wallet dari passkey-kit
  "createdAt"           BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS auth_otps (         -- terpisah dari `otps` milik claim
  "phoneHmac" TEXT PRIMARY KEY,
  "codeHash"  TEXT NOT NULL,
  "expiresAt" BIGINT NOT NULL,
  "attempts"  INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS auth_challenges (   -- challenge WebAuthn sekali-pakai, TTL 5 mnt
  "challenge" TEXT PRIMARY KEY,
  "senderId"  TEXT,
  "expiresAt" BIGINT NOT NULL
);

ALTER TABLE transfers ADD COLUMN IF NOT EXISTS "senderId" TEXT;
ALTER TABLE recurring ADD COLUMN IF NOT EXISTS "senderId" TEXT;
```

### 3.2 Tugas

1. **`src/routes/auth.ts`** — semua endpoint §2.1–2.3. OTP pakai ulang helper
   `lib/otp.ts` (Twilio Verify); hormati `OTP_PROVIDER=mock` → kode dev selalu `123456`
   (sama dengan mock alur claim yang ada).
2. **JWT** — `@fastify/jwt`, secret dari env `AUTH_JWT_SECRET`, TTL 30 hari,
   payload `{ senderId }`.
3. **`preHandler` auth** — decorator `app.authenticate`, dipasang di semua route
   §2.4. Query transfers/recurring ditambah filter `senderId`.
4. **WebAuthn** — `@simplewebauthn/server`; `rpID`/`origin` dari env
   (`AUTH_RP_ID=localhost`, `AUTH_ORIGIN=http://localhost:3000` untuk dev).
5. **Backfill demo** — baris lama tanpa `senderId` tidak perlu dimigrasi; cukup
   `WHERE "senderId" = $1` sehingga data lama tak muncul (data testnet).
6. **Rate limit OTP** — 3 request/menit/nomor, cek `attempts` max 5 (pola tabel
   `otps` yang ada).
7. **Env baru** → catat di `backend/README.md`: `AUTH_JWT_SECRET`, `PHONE_HMAC_KEY`,
   `AUTH_RP_ID`, `AUTH_ORIGIN`.

### 3.3 Acceptance criteria BE

- [x] `curl` tanpa token ke `GET /api/transfers` → 401 dengan bentuk error standar. *(lolos 2026-07-13)*
- [x] Alur penuh via curl (mode mock OTP): otp/request → otp/verify → dapat JWT →
      prepare/submit send → transfer muncul di `GET /api/transfers` milik sender itu,
      dan TIDAK muncul untuk JWT sender lain. *(lolos 2026-07-13)*
- [ ] Passkey register/login lolos dengan `@simplewebauthn` test vector atau
      integrasi manual dari FE. *(endpoint & challenge flow terpasang + teruji via curl;
      verifikasi attestation/assertion penuh butuh authenticator browser → Sync 2)*
- [x] `/api/claim/*` dan `/api/quote` tetap jalan tanpa token (e2e claim yang ada tidak rusak). *(lolos 2026-07-13)*
- [x] `senderName` di halaman claim = nama sender asli, bukan "Pengirim Sangu". *(lolos 2026-07-13)*

---

## 4. Pekerjaan FRONTEND (tim FE)

### 4.1 Klien API (`frontend/lib/api.ts`)

- Tambah fungsi: `requestAuthOtp`, `verifyAuthOtp`, `getPasskeyRegisterOptions`,
  `verifyPasskeyRegister`, `getPasskeyLoginOptions`, `verifyPasskeyLogin`, `getMe`
  — bentuk request/response persis §2.
- Helper `authFetch` yang menyisipkan `Authorization: Bearer <token>` — dipakai oleh
  SEMUA fungsi sender yang ada (`prepareSend`, `submitSend`, `getTransfers`,
  `getTransferDetail`, semua recurring). Fungsi claim/quote tidak berubah.
- Respons 401 di mana pun → hapus token → redirect ke halaman login.
- Simpan token di `localStorage` (cukup untuk demo hackathon).

### 4.2 Halaman & alur UI

1. **`app/login/page.tsx`** — dua jalur dalam satu layar:
   - Utama: "Masuk dengan sidik jari" (passkey login §2.2) untuk yang sudah daftar.
   - Sekunder: input nomor HP → OTP → (nama, jika baru) → sukses.
   Copy TANPA istilah crypto. OTP mock dev: `123456`.
2. **Setelah OTP sukses (user baru)**: langsung dorong pembuatan passkey —
   framing "Aktifkan sidik jari untuk keamanan & login cepat". Di langkah yang sama,
   buat smart wallet via passkey-kit dan kirim `walletAddress` ke
   `passkey/register/verify`. Boleh "Lewati dulu" (kirim tetap jalan mode demo,
   tapi tanpa passkey tidak bisa login cepat).
3. **Route guard** — halaman `send`, `transfers`, `recurring`, `account` butuh sesi;
   tanpa token redirect ke `/login`. Halaman `claim/*` tetap publik.
4. **`app/account`** — tampilkan nama + nomor HP masked (dari `GET /api/auth/me`),
   tombol keluar (hapus token), status "Sidik jari aktif ✓".
5. **Alur send** — hapus pengiriman `senderAddress` dari body prepare (§2.4);
   prompt tanda tangan XDR tetap seperti sekarang, hanya pastikan copy-nya
   "Konfirmasi pengiriman dengan sidik jari".

### 4.3 Acceptance criteria FE

- [ ] Buka `/transfers` tanpa login → dilempar ke `/login`; setelah login → kembali.
- [ ] Daftar baru (mock OTP `123456`) → buat passkey → kirim transfer → riwayat tampil.
- [ ] Tutup tab, buka lagi → langsung masuk (token tersimpan).
- [ ] Hapus token (logout) → "Masuk dengan sidik jari" → masuk tanpa OTP.
- [ ] Tidak ada satu pun kata wallet/address/sign/XDR yang tampil ke user.
- [ ] Alur claim penerima tidak tersentuh dan tetap lolos e2e yang ada.

---

## 5. Urutan kerja paralel & titik sinkronisasi

```
Hari 1  BE: skema DB + OTP endpoints + JWT + preHandler (§3.2 no.1–3, 6)
        FE: halaman login (UI dulu, pakai mock fetch), authFetch + route guard
   ⟂ keduanya independen — kontrak §2 sudah final

Sync 1  BE deploy lokal → FE ganti mock ke endpoint asli; uji alur OTP + guard 401

Hari 2  BE: WebAuthn register/login (§3.2 no.4)
        FE: integrasi passkey (create/get) + langkah "aktifkan sidik jari"

Sync 2  Uji integrasi passkey end-to-end (butuh origin sama: FE :3000, BE :4000,
        AUTH_ORIGIN menunjuk FE)

Hari 3  Gabung: alur penuh daftar → kirim → claim; rapikan copy; e2e
```

Aturan main:
- Kontrak §2 hanya boleh berubah lewat kesepakatan dua pihak; update file ini dulu,
  baru kode.
- FE jangan menebak bentuk respons — kalau ragu, cek file ini atau tanya BE.
- Mode mock (`OTP_PROVIDER=mock`, kode `123456`) adalah default dev & demo;
  Twilio hanya untuk uji sesekali.
