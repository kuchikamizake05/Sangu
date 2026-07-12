# Spesifikasi Teknis & Pembagian Kerja — Remittance PMI (placeholder: "Rantau")

> Dokumen acuan tim untuk **Stellar APAC Hackathon**. Sumber kebenaran (source of truth) untuk
> *interface* antar-bagian, supaya **smart contract / backend / frontend bisa kerja paralel
> tanpa saling tunggu**. Konsep produk lengkap ada di `konsep-produk-remittance-pmi.md`.
>
> Keputusan terkunci: **all-Soroban; wallet pengirim & escrow non-custodial, off-ramp trusted**
> (lihat §2.5), koridor **Malaysia (RM) + Hong Kong (HKD)**, cash-out via **SDF Test Anchor
> (SEP-24)** — withdrawal nyata, payout IDR disimulasikan; **rate FX real (referensi, biaya
> estimasi)**; track **Payment & Consumer**.

---

## 1. Arsitektur Ringkas

```
┌─────────────────────┐        ┌──────────────────────────┐        ┌────────────────────┐
│  FRONTEND            │        │  BACKEND / RELAYER       │        │  STELLAR TESTNET   │
│  • App Pengirim (PWA)│──REST─▶│  • REST API              │──RPC──▶│  • Escrow contract │
│  • Halaman Claim     │        │  • OTP (SMS)             │        │  • Registry/Ledger │
│    (tanpa app)       │◀─REST──│  • Relayer (bayar fee)   │◀───────│  • USDC (SAC)      │
│  • passkey smart     │        │  • FX rate (kurs live)   │        └────────────────────┘
│    wallet (pengirim) │        │  • Jembatan SEP-24 anchor │──SEP-24─▶ SDF Test Anchor
└─────────────────────┘        │  • Scheduler + keeper     │           (cash-out/e-wallet)
                               └──────────────────────────┘
```

**Alur inti:** pengirim (passkey wallet) → `escrow.deposit` → link ke WhatsApp → penerima buka
link → OTP → `escrow.claim` → SEP-24 withdraw (e-wallet/tunai). Jika expiry lewat →
`escrow.refund` (keeper).

---

## 2. Kontrak Bersama (SOURCE OF TRUTH — jangan diubah sepihak)

Semua perubahan pada bagian 2 **wajib disepakati bersama** karena mengikat ketiga departemen.

### 2.1 Escrow Soroban Contract — interface

**Tipe data:**
```rust
#[contracttype]
pub enum EscrowStatus { Pending, Claimed, Refunded }

#[contracttype]
#[derive(Clone, Debug)]  // Debug perlu untuk assert_eq! di test
pub struct Escrow {
    pub sender: Address,              // passkey smart wallet pengirim
    pub amount: i128,                 // jumlah USDC (7 desimal, stroops)
    pub hashlock: BytesN<32>,         // sha256(secret) — secret dipegang backend, TIDAK di URL
    pub recipient_commitment: BytesN<32>, // HMAC server-side; TAK dapat direkonstruksi publik.
                                          // BUKAN sha256(nomor HP). Tidak dipakai auth on-chain.
    pub expiry: u64,                  // unix seconds (ledger timestamp)
    pub status: EscrowStatus,
}
```

**Fungsi:**
```rust
// dipanggil sekali saat deploy
fn init(env, admin: Address, usdc_token: Address, anchor_allowlist: Vec<Address>);

// PENGIRIM: butuh sender.require_auth(); transfer USDC sender→contract; simpan; return id.
// NON-CUSTODIAL: backend TIDAK submit atas nama user — ia menyusun XDR unsigned, passkey wallet
// meng-authorize/sign, lalu di-submit (relayer fee-bump). Lihat §2.3 (send = prepare + submit).
fn deposit(
    env, sender: Address, amount: i128,
    hashlock: BytesN<32>, recipient_commitment: BytesN<32>, expiry: u64
) -> u64;                         // -> escrow_id

// CLAIM: TANPA require_auth — otorisasi = `secret` (hashlock) + destination ∈ allowlist
// syarat: status==Pending && now < expiry && sha256(secret)==hashlock && dest ∈ allowlist
fn claim(env, escrow_id: u64, secret: Bytes, payout_destination: Address);

// REFUND: permissionless; syarat: status==Pending && now >= expiry; dana HANYA balik ke sender
fn refund(env, escrow_id: u64);

// view
fn get_escrow(env, escrow_id: u64) -> Escrow;

// admin
fn add_anchor(env, admin: Address, anchor: Address);
fn remove_anchor(env, admin: Address, anchor: Address);
```

**Events (di-emit tiap fungsi — dipakai backend untuk tracking):**
```
("deposit", escrow_id: u64)  data: (sender, amount, expiry)
("claim",   escrow_id: u64)  data: (payout_destination, amount)
("refund",  escrow_id: u64)  data: (sender, amount)
```

**Errors (panic dengan kode — backend mapping ke pesan):**
```
1 NotFound  2 AlreadySettled  3 Expired  4 NotYetExpired
5 BadSecret 6 DestinationNotAllowed  7 Unauthorized  8 InsufficientAmount
```

**Model otorisasi (penting):**
- `deposit` → `sender.require_auth()` (passkey wallet menandatangani); **fee dibayar relayer**
  (fee-bump / Launchtube).
- `claim` → **tak ada** `require_auth`; keamanan dari `secret` + `allowlist`. Backend memanggil
  **setelah OTP** lolos. Dana tak bisa dibelokkan ke alamat liar (destination wajib allowlist),
  **tapi** backend mengendalikan pemicuan → bagian dari **batas trusted off-ramp** (§2.5).
- `refund` → permissionless; dana terikat ke `sender`, jadi keeper mana pun aman memanggilnya.

### 2.2 Model Link / Secret / OTP (keamanan — siapa pegang apa)

- **`secret`** = nilai acak 32-byte, **dipegang BACKEND — TIDAK PERNAH di URL/link.** `hashlock =
  sha256(secret)` disimpan on-chain saat `deposit`.
- **Link claim** yang di-share ke WhatsApp = URL berisi **`token` opaque saja** (bukan secret),
  memetakan ke `{escrow_id, secret, recipient_commitment, phone, nonce}` di DB backend.
- Penerima buka link → **OTP ke nomor HP** → backend verifikasi nomor (lookup DB via **HMAC**,
  bukan hash tebakan) → baru backend memicu `claim(escrow_id, secret, SETTLEMENT)`.
- Efek: bila link bocor, tanpa OTP tak bisa dicairkan; dana hanya bisa ke settlement/anchor
  allowlist, tak bisa dicuri ke alamat liar.

### 2.5 Batas non-custodial (jujur — jangan over-claim)

- **Non-custodial:** wallet **pengirim** (kunci di user via passkey) + **escrow on-chain** (dana
  tunduk aturan contract; backend tak pegang key pengirim, tak bisa alihkan dana ke alamat liar).
- **Trusted / custodial boundary:** **off-ramp**. Backend mengendalikan *kapan* `claim` dipicu,
  akun **settlement**, memo, dan konversi fiat via anchor. Ini titik terpercaya — wajar untuk
  semua off-ramp fiat. Klaim resmi: **"wallet pengirim + escrow non-custodial; off-ramp trusted."**

### 2.3 REST API Backend ↔ Frontend (interface)

> Base URL, auth header, dan error shape disepakati backend; di bawah = kontrak minimum.
> Semua uang dikirim sebagai string desimal untuk hindari float error.

**Pengirim (butuh sesi login):**
```
GET  /api/quote?corridor=MY&amountForeign=500
     // rate = REAL tapi REFERENSI; biaya = ESTIMASI/DEMO (wajib label + sumber + timestamp)
     → { rate, amountIdr, estimate:true, rateSource, rateAsOf,
         feeIdrEstimate, comparison:{ westernUnionFeeIdrEstimate, note } }

// KIRIM = 2 LANGKAH (non-custodial): backend TIDAK membelanjakan dana user.
POST /api/send/prepare
     body: { corridor, amountForeign, recipientPhone, methodHint? }
     → { transferId, unsignedXDR, quote, expiry }   // unsignedXDR di-authorize passkey wallet

POST /api/send/submit
     body: { transferId, signedXDR }                 // hasil sign passkey
     → { transferId, escrowId, claimUrl }            // claimUrl = token opaque, TANPA secret

GET  /api/transfers            → [ { transferId, status, amount, recipientMasked, createdAt } ]

POST /api/recurring            // Sangu Bulanan (tiap kirim tetap perlu sign passkey — lihat catatan §5)
     body: { recipientPhone, corridor, amountForeign, dayOfMonth }
     → { recurringId }
```

**Penerima (tanpa login, akses via token link):**
```
GET  /api/claim/:token         → { senderName, amountIdr, corridor, status }
POST /api/claim/:token/otp/request   → { sent: true }
POST /api/claim/:token/otp/verify    body: { code } → { ok, claimSession }
POST /api/claim/:token/payout
     body: { method: "dana"|"gopay"|"bank"|"cash", details }
     // withdrawal SEP-24 REAL; settlement IDR/tunai DISIMULASIKAN di layer anchor
     → { status, simulatedPayout:true, cashCode?, instructions? }
```

**Status transfer (enum bersama):** `PENDING` → `CLAIMED` → `PAID_OUT` | `REFUNDED` | `EXPIRED`.

### 2.4 Konvensi Bersama

- **Network:** Stellar **Testnet** (Soroban RPC + Horizon + friendbot).
- **Aset:** USDC test (SAC). Address token & escrow contract id disimpan di `.env` bersama.
- **Desimal:** USDC 7 desimal (stroops `i128`). Uang di API = string.
- **Waktu:** `expiry` = unix seconds; default **72 jam**.
- **Format nomor HP:** E.164 (`+62812...`). Komitmen on-chain = **`HMAC(COMMITMENT_KEY, E164 ||
  nonce)`** (server-side), **bukan** `sha256(E164)`. Lookup DB juga via HMAC.
- **`.env` bersama (contoh):** `NETWORK`, `RPC_URL`, `HORIZON_URL`, `USDC_SAC`, `ESCROW_ID`,
  `REGISTRY_ID`, `ANCHOR_SEP24_URL`, `RELAYER_SECRET`, `SETTLEMENT_SECRET`, `COMMITMENT_KEY`,
  `FX_API_URL`, `OTP_PROVIDER`.

---

## 3. Departemen: SMART CONTRACT (Soroban / Rust)

**Owner:** temanmu.

**Tech stack:**
- Rust + **Soroban SDK** (`soroban-sdk`).
- **`stellar-cli`** (dulu `soroban-cli`) untuk build/deploy/invoke.
- Testutils Soroban + `cargo test` untuk unit test.
- USDC via **Stellar Asset Contract (SAC)** token client.

**Tugas:**
1. **Escrow contract** sesuai interface 2.1: `init`, `deposit`, `claim`, `refund`, `get_escrow`,
   admin anchor. Termasuk cek hashlock (`sha256`), timelock (`env.ledger().timestamp()`),
   allowlist, transfer USDC via token client, emit events, error codes.
2. **Unit test** tiap jalur: happy claim, refund setelah expiry, secret salah, destination bukan
   allowlist, double-claim, claim setelah expiry.
3. **Deploy ke testnet** + serahkan **contract id**, ABI/spec, dan address USDC SAC ke tim.
4. **(Layer 2, jika sempat) Registry/Ledger contract:** simpan preferensi penerima (kunci =
   **HMAC commitment**, bukan hash nomor mentah) + catat riwayat kiriman (fondasi pinjaman mikro).

**Catatan integrasi (koordinasi dgn backend):**
- `claim` mengirim USDC ke `payout_destination`. Untuk SEP-24, destination = **akun settlement
  yang di-allowlist**, lalu backend menjembatani ke anchor dengan memo (lihat 4, catatan anchor).
- Sepakati **format event** persis (nama simbol + urutan data) — backend membacanya.

**Acceptance criteria:**
- Semua fungsi 2.1 jalan di testnet, bisa di-invoke via `stellar-cli`.
- Test lengkap hijau (termasuk kasus gagal).
- Transaksi `deposit`/`claim`/`refund` terlihat di Stellar Explorer (bukti demo).

---

## 4. Departemen: BACKEND / RELAYER (Node.js / TypeScript)

**Tech stack:**
- **Node.js + TypeScript**; framework Fastify/Express (atau Next.js API routes bila satu repo).
- **`@stellar/stellar-sdk`** (Horizon + Soroban RPC client) untuk susun & submit tx.
- **Relayer / fee-bump** (bayar fee user) — via fee-bump tx atau **Launchtube**.
- **DB:** Postgres + Prisma (atau SQLite untuk hackathon). Simpan mapping token↔escrow, secret,
  status, riwayat, jadwal.
- **OTP:** Twilio Verify (sandbox) atau provider SMS mock.
- **FX rate API (kurs live REAL):** mis. `exchangerate.host` / `open.er-api.com` — RM→IDR, HKD→IDR.
- **SEP-24 + SEP-10 client** untuk anchor (jembatan cash-out).

**Tugas:**
1. **REST API** sesuai 2.3 (quote; **send = prepare + submit**; transfers, recurring; claim/otp/payout).
2. **Deposit non-custodial (#3):** `prepare` susun **XDR unsigned** (backend TAK spend dana user) →
   frontend sign passkey → `submit` fee-bump + kirim signedXDR. Baca `escrowId` dari event.
   Untuk `claim`/`refund` (tak butuh auth pengirim) relayer submit langsung.
3. **Generator secret + commitment:** `secret` (32B) & `hashlock`; **`recipient_commitment` =
   HMAC(COMMITMENT_KEY, phone||nonce)**. `token` opaque untuk link. **secret & phone tak pernah
   ke frontend.**
4. **OTP flow:** kirim & verifikasi; lookup nomor via **HMAC** (bukan sha256 tebakan).
5. **Kurs/biaya (#6):** rate dari FX API (REAL, referensi) + **label estimasi + `rateSource` +
   `rateAsOf`**; `feeIdrEstimate` & perbandingan WU = **estimasi/demo**, jangan disebut biaya final.
6. **Jembatan SEP-24 (#5):** SEP-10 auth → `interactive` withdraw → `escrow.claim(SETTLEMENT)` →
   relay ke anchor (memo) → balikin `cashCode`/instruksi **bertanda `simulatedPayout:true`**
   (withdrawal nyata; settlement IDR/tunai disimulasikan).
7. **Scheduler:** Sangu Bulanan + **keeper `refund`** saat expiry.

**Catatan anchor (wrinkle penting):** SEP-24 anchor bergaya Classic & butuh **memo** untuk
identifikasi withdrawal, sedangkan transfer Soroban tak membawa memo. Pola: `claim` mengirim USDC
ke **akun settlement backend** (di-allowlist di contract), lalu backend melakukan **pembayaran
Classic ber-memo** ke anchor. Leg fiat ini memang titik trust (wajar untuk semua off-ramp fiat) —
tegaskan di slide. Uji dulu ke **SDF Test Anchor** (identik MoneyGram); referensi:
`stellar/moneygram-access-wallet-mvp`.

**Acceptance criteria:**
- End-to-end: `POST /api/send` menghasilkan escrow on-chain + link; `/payout` memicu claim +
  SEP-24 withdraw nyata (Test Anchor) dan mengembalikan status.
- Kurs yang tampil = angka FX API real.
- Keeper refund otomatis jalan saat expiry.

---

## 5. Departemen: FRONTEND (Next.js / TypeScript)

**Tech stack:**
- **Next.js + TypeScript + Tailwind + shadcn/ui**; **PWA** (mobile-first).
- **passkey-kit / smart wallet SDK** (secp256r1 passkey) untuk akun pengirim non-custodial.
- Konsumsi **REST API backend** (bagian 2.3). Frontend **tidak** menyimpan secret/relayer key.
- i18n **Bahasa Indonesia** (halaman claim). Number formatting rapi (Rp/RM/HKD).

**Dua permukaan:**

**A. App Pengirim (PWA penuh):**
1. **Onboarding passkey** — "Masuk dgn wajah/sidik jari" → buat/tautkan smart wallet.
2. **Isi saldo** (mock on-ramp) → tampil sebagai Rp/RM/HKD.
3. **Alur kirim (4 layar):** pilih penerima (kontak/nomor) → jumlah + **transparansi biaya**
   (dari `/api/quote`, kurs live) → pilih koridor (MY/HK) → konfirmasi biometrik → **"Terkirim" +
   tombol Share WhatsApp** (link claim).
4. **Riwayat** (`/api/transfers`) + status.
5. **Sangu Bulanan** — layar setup (`/api/recurring`).

**B. Halaman Claim (penerima, TANPA app):**
1. Buka link `token` → tampil "[Nama] mengirimimu Rp X" (`GET /api/claim/:token`).
2. Tombol besar **"Cairkan"** → **OTP** (request/verify).
3. Pilih cara terima: **DANA / GoPay / bank / ⭐ Tunai di gerai** (`/payout`).
4. Hasil: "Sedang dikirim ke DANA" / **kode penarikan + peta gerai** (cash).
5. Desain: tombol besar, teks minim, jalan di HP murah & sinyal lemah; opsi **fallback SMS**.

**Acceptance criteria:**
- Pengirim bisa login passkey, kirim, dapat link share-able; layar transparansi biaya pakai kurs live.
- Halaman claim jalan di browser mobile tanpa install; alur OTP → pilih cair → status mulus.
- **"Wow moment":** opsi "Tunai di gerai" menampilkan kode penarikan (klimaks demo).

---

## 6. Dependency & Urutan Integrasi

| Butuh | Dari | Kapan |
|---|---|---|
| Interface 2.1 & 2.3 disepakati | Semua | **Langkah 0 — sebelum coding** |
| Contract id + USDC SAC + event format | Smart Contract → Backend | Awal (backend bisa mock dulu pakai interface) |
| REST API mock/stub | Backend → Frontend | Awal (frontend pakai stub sesuai 2.3) |
| `claim`/allowlist final + settlement account | Contract ↔ Backend | Sebelum integrasi cash-out |
| Deploy contract testnet | Smart Contract | Sebelum integrasi end-to-end |

**Strategi anti-tunggu:** semua kerja terhadap **interface di bagian 2**. Backend sediakan
**stub REST** lebih dulu supaya frontend jalan; contract dev kerjakan Rust paralel; integrasi
nyata saat contract id & anchor siap.

---

## 7. Spike Hari-1 (WAJIB — de-risk sebelum bangun penuh)

Tiga ketidakpastian teknis ini hanya ketahuan lewat kode, bukan diskusi. **Kerjakan sebagai
spike kecil di hari pertama, sebelum bangun fitur penuh.** Jika ada yang macet, pakai fallback-nya
supaya jalur utama tetap jalan.

### Spike 1 — Passkey smart wallet meng-`require_auth` contract Soroban
- **Kenapa:** smart wallet = contract account (`C...`) dengan auth kustom (passkey secp256r1);
  `deposit` butuh dia menandatangani. **Bagian tersulit & paling belum terbukti.**
- **Buktikan:** satu passkey wallet berhasil memanggil `deposit` di testnet (tx sukses di Explorer).
- **Owner:** Frontend (passkey-kit) + Smart Contract (uji `require_auth`).
- **Fallback bila macet:** pengirim pakai **akun Stellar biasa** dulu (key dikelola app),
  passkey menyusul belakangan. Jalur demo tetap utuh.

### Spike 2 — Kecocokan aset escrow ↔ aset anchor
- **Kenapa:** SDF Test Anchor hanya bisa withdraw **aset SEP-24 tertentu**; aset yang dipegang
  escrow **harus sama**.
- **Buktikan:** cek aset withdraw Test Anchor → pakai aset **itu** di contract & escrow.
- **Owner:** Backend (cek anchor) + Smart Contract (set token/SAC).
- **Fallback bila beda:** tambahkan langkah konversi (swap) atau ganti aset escrow agar cocok.

### Spike 3 — SEP-24 withdraw end-to-end (settlement account + memo)
- **Kenapa:** anchor butuh **memo**, transfer Soroban tak bawa memo → butuh pola settlement
  account (wrinkle di §4).
- **Buktikan:** lakukan **satu withdraw sukses** ke SDF Test Anchor (SEP-10 auth → interactive →
  bayar ber-memo → dapat konfirmasi) **sebelum** menyambungkannya ke escrow.
- **Owner:** Backend.
- **Fallback bila macet:** demokan cash-out sampai layer "instruksi/kode" dari anchor; sambungan
  otomatis escrow→anchor jadi item terakhir.

> Aturan: jangan bangun fitur penuh di atas asumsi ketiganya aman. **Spike dulu → baru scale.**

---

## 8. Definition of Done (demo-ready)

- [ ] Kirim → `prepare` → sign passkey → `submit` → `deposit` on-chain (terlihat di Explorer) → link (token opaque).
- [ ] Buka link → OTP → `claim` → **withdrawal SEP-24 nyata (SDF Test Anchor)** → status cair
      (payout IDR/tunai **disimulasikan** — copy jujur).
- [ ] Opsi **cash-out** menampilkan kode penarikan (wow moment) + label simulasi.
- [ ] **Transparansi biaya** pakai **rate FX real**, biaya **dilabeli estimasi + sumber + timestamp**.
- [ ] **Refund otomatis** saat expiry (keeper) — didemokan dengan expiry pendek.
- [ ] Passkey login + escrow **non-custodial** (off-ramp trusted — sebut apa adanya).
- [ ] (Bonus) Registry/Ledger contract mencatat riwayat.
- [ ] Pitch deck: pasar + demo + "kenapa Stellar" + batas non-custodial jujur + roadmap.
