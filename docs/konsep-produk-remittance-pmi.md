# Konsep Produk — Remittance untuk Pekerja Migran Indonesia (PMI)

> Dokumen konsep untuk **Stellar APAC Hackathon**. Terinspirasi Morse (dulu Sling Money),
> tapi difokuskan ulang untuk pasar PMI dengan satu fitur pembunuh: **kirim uang semudah kirim
> pesan, penerima cairkan tanpa install apa pun — bahkan bisa ambil tunai untuk yang tak
> punya rekening bank.**
>
> **Rail: Stellar.** Remittance adalah use-case inti Stellar, dan banyak hal yang di chain lain
> harus di-*mock* atau diakali, di Stellar sudah jadi primitive bawaan (lihat bagian 7).
>
> Nama produk: **belum final** (kandidat di bagian akhir). Placeholder: **"Rantau"**.

---

## 1. Ringkasan Eksekutif

**Satu kalimat:**
Cara termudah bagi PMI mengirim uang pulang — semudah kirim pesan WhatsApp — dan keluarga
menerimanya dalam Rupiah tanpa perlu install app, tanpa rekening bank, tanpa tahu itu kripto,
bahkan bisa **ambil tunai** di gerai terdekat.

**Masalah:** Kirim uang lintas negara masih mahal (rata-rata 6–7% biaya), lambat (1–2 hari),
dan hampir semua layanan mewajibkan penerima punya app/rekening — padahal banyak keluarga PMI
di kampung *unbanked*. Tembok terbesar bukan di sisi pengirim, tapi di sisi **penerima**.

**Solusi:** Stablecoin (USDC) di **Stellar** sebagai rail (settlement 3–5 detik, fee ~$0,00001),
dibungkus UX yang menyembunyikan kripto sepenuhnya. Pengirim pakai app; **penerima cukup buka
satu link** — lalu pilih cair ke e-wallet, rekening, atau **tarik tunai**.

**Kenapa menang di hackathon:**
- **Pain nyata + pasar besar** (~US$15,5 miliar/tahun remitansi PMI).
- **"Wow moment" demo yang konkret:** keluarga unbanked ambil uang **tunai**.
- **Alasan teknis memilih Stellar yang kuat:** killer feature kami (link-claim + expiry +
  auto-refund, gasless, penerima nol-modal, dan cash-out) memetakan langsung ke **primitive
  bawaan Stellar** — bukan tempelan. Ini cerita yang disukai juri: "kami pilih chain ini
  karena fitur yang tak ada di tempat lain."

---

## 2. Data Pasar (validasi)

- Remitansi PMI ke Indonesia: **~US$15,5 miliar/tahun (± Rp 255 triliun)**.
- Indonesia = **penerima remitansi terbesar ke-4 dunia**.
- Biaya kirim rata-rata global masih **6–7%** (target PBB: 3%). Ini "musuh" yang kita lawan.

**Sebaran PMI berdasarkan JUMLAH pekerja (penempatan 2024, BP2MI — total 297.434):**

| # | Negara | Pekerja | Profil khas |
|---|---|---|---|
| 1 | Hong Kong | 99.773 | ART/caregiver, mayoritas perempuan, melek digital |
| 2 | Taiwan | 84.581 | Caregiver & pabrik, melek digital |
| 3 | Malaysia | 51.723 | Perkebunan/konstruksi/ART, banyak informal |
| 4 | Jepang | 12.720 | Naik cepat (+31%), sektor formal |
| 5 | Singapura | 10.819 | ART, naik cepat (+37%) |

**Sebaran berdasarkan VOLUME UANG (remitansi 2023 — total ~$15,5 miliar):**

| # | Negara | Remitansi |
|---|---|---|
| 1 | Malaysia | $4,59 miliar |
| 2 | Arab Saudi | $3,95 miliar |
| 3 | Taiwan | $2,02 miliar |
| 4 | Hong Kong | $1,82 miliar |
| 5 | Singapura | $412 juta |

> Catatan strategi: 5 negara ini = **~90% total remitansi**. Jumlah pekerja terbanyak ada di
> HK/Taiwan (padat, digital-savvy), tapi uang terbesar dari Malaysia/Saudi (pain terparah,
> keluarga sering unbanked → cash-out jadi krusial).

> Catatan APAC/hackathon: koridor **Hong Kong, Taiwan, Malaysia, Singapura** semuanya di APAC —
> pas dengan tema hackathon. Demo pakai **2 koridor** agar UI menampilkan pilihan (bukan cuma 1):
> usulan **Malaysia (RM)** untuk pamer cash-out unbanked + **Hong Kong (HKD)** untuk e-wallet
> digital. Sisanya "coming soon".

**Sumber:** BP2MI Statistik 2024; Databoks (remitansi 5 negara); GoodStats; Kompas.

---

## 3. Strategi Fokus: "Arah C"

**Corridor-agnostic, satu fitur pembunuh.** Kita tidak bertaruh pada satu negara. Yang penting
adalah **jembatan chat → uang** yang universal, plus **cash-out** untuk yang unbanked. Untuk demo
pakai **2 koridor** (Malaysia + Hong Kong) agar pilihan koridor terlihat; sisanya "coming soon".

**Tesis produk:**
> Kita bukan "bank untuk PMI". Kita adalah cara paling mudah mengirim uang pulang — semudah
> kirim pesan — dan keluarga menerima tanpa hambatan apa pun, bahkan tanpa rekening bank.

---

## 4. Killer Feature (satu, jangan lebih)

**"Kirim uang lewat link — penerima cairkan tanpa app, tanpa rekening, tanpa tahu itu kripto,
bahkan bisa tarik tunai."**

Alur inti:
1. PMI ketik jumlah → dapat **link claim** → share ke WhatsApp keluarga.
2. Keluarga buka link di browser HP → pilih **DANA / GoPay / rekening bank / tunai di gerai**.
3. Uang cair dalam Rupiah pada kurs asli. Selesai.

**Pembeda kunci vs kompetitor:** Wise, Morse, Flip, Western Union — semuanya mewajibkan penerima
punya akun/app/rekening (atau mahal). Kita **menghapus tembok itu** — dan itulah hambatan
terbesar bagi keluarga PMI di kampung. Ditambah opsi **tarik tunai** untuk yang benar-benar
tak tersentuh bank.

---

## 5. Model Dua Sisi yang Timpang (Asymmetric)

Ini keputusan desain paling penting dari produk.

### Pengirim (PMI di luar negeri) — punya app penuh
- Login, wallet (tersembunyi), isi saldo, kirim, riwayat.
- Menanggung bagian "berat": KYC, funding, adopsi. Wajar — dia yang paling termotivasi.

### Penerima (keluarga di Indonesia) — TANPA app
- Cukup terima link WhatsApp → buka di browser → pilih cara cairkan → selesai.
- Nol instalasi, nol pendaftaran, nol seed phrase, **nol modal** (biaya akun disponsori).

### Nuansa penting yang harus diputuskan
1. **Penerima berulang → "akun ringan".** Keluarga terima tiap bulan dari orang yang sama.
   Setelah claim pertama, simpan preferensi lewat link ter-personalisasi / PWA ringan (web,
   bukan app store). Claim berikutnya cukup 1 tap.
2. **Custody saat link belum di-claim.** Dana ditahan **on-chain** sampai di-claim;
   **auto-refund** ke pengirim bila kadaluarsa (mis. 72 jam). Ini sekaligus fitur keamanan:
   "salah kirim? uang balik otomatis." (Di Stellar ini native — lihat bagian 7.)
3. **Keamanan link** (titik paling rawan → jadikan fitur):
   - **Verifikasi nomor HP penerima (OTP saat claim)** — hanya nomor tujuan yang bisa buka.
   - **Expiry + auto-refund.**
   - Pesan jual: "Aman. Hanya ibu yang bisa mencairkan."
4. **Loop viral tak terduga.** Penerima hari ini bisa jadi pengirim besok (adik yang merantau),
   atau titik cash-out (warung yang sering nyairin jadi agen). Ini growth engine untuk pitch.

### Insight utama
**Pengalaman PENERIMA adalah produk sebenarnya.** Kompetitor sibuk memoles app pengirim.
Kemenangan kita ada di 10 detik pengalaman penerima: ibu 55 tahun, HP Android murah, sinyal
pas-pasan, mungkin **tanpa rekening bank**. Desain sisi penerima harus:
- Buka via WhatsApp, jalan di **browser** (no app store).
- **Bahasa Indonesia sederhana, tombol besar, minim teks.**
- Jalan di koneksi lambat; pertimbangkan **fallback SMS/OTP** untuk yang paling unbanked.
- Opsi cair familiar: **DANA, GoPay, transfer bank, dan tunai di gerai.**

---

## 6. Wow-Feature Demo (1 bintang + 2 pendukung)

Keputusan: **satu killer flow yang mulus** + **tiga wow-feature** yang beda bobot. Cuma yang
pertama jadi integrasi berat; dua lainnya murah tapi efektif.

### ⭐ BINTANG UTAMA — Cash-out tunai (MoneyGram Access / agen)
**Kenapa ini bintangnya:** ini satu-satunya fitur yang **cuma bisa diklaim di Stellar**.
Stellar punya kerjasama resmi dengan **MoneyGram Ramps** (dulu "MoneyGram Access") — USDC di
Stellar bisa ditarik jadi **uang tunai** di jaringan gerai MoneyGram (luas di APAC/Indonesia
lewat agen, pos, minimarket). Ini menuntaskan masalah tersulit remittance: keluarga **unbanked**
tetap bisa terima uang fisik.

- Pesan pitch: *"Ibu di kampung yang tak punya rekening bank sekalipun tetap bisa terima
  uang tunai — dan itu cuma mungkin di Stellar."*
- Ini sekaligus **alasan teknis** memilih Stellar (bukan sekadar preferensi).

**Strategi cash-out yang aman (hasil riset — lihat 14 & catatan di bawah):**
MoneyGram Ramps memakai **SEP-24 + SEP-10**. Sandbox MoneyGram sendiri **butuh allowlist**
(email partner MoneyGram + daftarkan public key + domain wallet) — gate bisnis, timing-nya
tak pasti untuk hackathon. **TAPI**: SDF menyediakan **Stellar Test Anchor** yang mengimplementasi
**API SEP-24 yang persis sama** (beda asetnya saja). Jadi rencananya:
- **Bangun integrasi cash-out nyata terhadap SDF Test Anchor (SEP-24).** Ini **bukan mock** —
  ini alur anchor withdraw sungguhan, secara teknis identik dengan MoneyGram. Ada juga repo
  referensi `stellar/moneygram-access-wallet-mvp`.
- **Pitch:** *"Cash-out kami sudah jalan lewat SEP-24 nyata; MoneyGram adalah integrasi yang
  sama persis — tinggal allowlist partner."* → kredibel & anti-gagal saat demo.
- **Paralel:** email partner MoneyGram sejak awal; kalau allowlist keburu, tinggal ganti
  endpoint/aset ke MoneyGram asli.
- To-do riset tersisa: koridor & cash-pickup MoneyGram spesifik Indonesia (untuk narasi produksi).

### Pendukung 1 — Transparansi biaya brutal (WAJIB tampil, biaya bangun ~nol)
Layar besar saat kirim: **"Western Union potong Rp 82.000. Kami: Rp 150."** Kontras brutal =
pitch emas. Selalu nempel di layar kirim; efek maksimum, usaha minimum.

### Pendukung 2 — Sangu Bulanan (kiriman rutin otomatis)
Set kirim Rp X tiap tanggal gajian. Retensi + cerita emosional "kirim ke ibu tiap bulan".
Untuk demo cukup tunjukkan **setup**-nya (tak perlu menunggu tanggal). Fondasi untuk fitur
masa depan (pinjaman mikro berbasis riwayat kiriman).

---

## 7. Kenapa Stellar (yang di chain lain "mock", di sini native)

Ini inti kenapa produk ini pindah ke Stellar — dan kenapa itu memperkuat pitch, bukan sekadar
ganti logo. Setiap bagian "berat/akalin" berubah jadi **primitive bawaan**:

| Elemen produk | Di chain lain | **Di Stellar (native)** |
|---|---|---|
| Escrow + link-claim + expiry + **auto-refund** | Program escrow custom + rawan | **Soroban escrow contract** — logika claim (hashlock link) + refund (timelock) diberlakukan on-chain, **non-custodial**. Refund hanya bisa balik ke pengirim; dana tak bisa dibelokkan. |
| Sembunyikan kripto (no seed phrase) **+ non-custodial** | Embedded wallet pihak ketiga / custodial | **Passkey smart wallet (Soroban)** — login Face ID/sidik jari, tanpa seed phrase, **kunci tetap di user**. Inilah alasan kita all-Soroban. |
| **Gasless** (user tak perlu bayar gas) | "Fee abstraction" tempelan | **Fee-bump + relayer (Launchtube)** — app/relayer bayar fee; smart wallet cukup meng-*authorize*. |
| **Cash-out tunai** (unbanked) | Mock total | **MoneyGram Ramps + SDF Test Anchor** — alur SEP-24 nyata; tarik tunai live di Stellar. |
| On/off-ramp fiat (e-wallet/bank) | Mock (MoonPay/Transak) | **Anchors + SEP-24** — jalur fiat resmi Stellar; FX ke IDR terjadi di sisi anchor. (Anchor Indonesia = item riset.) |
| Riwayat kiriman & registry penerima | DB tersembunyi | **Soroban contract storage** — riwayat on-chain = fondasi pinjaman mikro; composability untuk pengembangan lanjutan. |

> Catatan konversi lintas mata uang: karena settlement on-chain seluruhnya **USDC**, FX (RM/HKD→IDR)
> terjadi di **tepi fiat (anchor on/off-ramp)**, bukan lewat Classic Path Payments. Path Payments
> tetap opsi bila kelak ada aset-fiat on-chain, tapi bukan jalur MVP non-custodial ini.

**Arsitektur (ringkas — detail di bagian 14): all-Soroban; wallet pengirim & escrow non-custodial, off-ramp trusted.**
- **Passkey smart wallet (Soroban)** = akun pengirim; non-custodial, login biometrik.
- **Soroban escrow contract** = mesin transfer inti (deposit → claim via link+OTP → refund via
  timelock). Killer flow.
- **Soroban registry/ledger contract** = "otak": profil penerima berulang + riwayat kiriman.
  Layer di atas escrow.

> Prinsip urutan kerja: **escrow contract + killer flow harus anti-gagal DULU** (itu yang
> didemo). Registry/riwayat menyusul. Kalau molor, demo tetap utuh.
>
> Trade-off jujur: non-custodial + all-Soroban lebih "berat" (tulis contract Rust) daripada
> Claimable Balances, **tapi** memberi cerita non-custodial + smart-contract yang lebih kuat di
> mata juri, dan fondasi composability untuk roadmap. Ini keputusan sadar.

---

## 8. Daftar Fitur (bertingkat)

### WAJIB ada (bikin killer feature jalan)
- **Kripto tak terlihat + non-custodial** — user lihat Rupiah/Ringgit, tak pernah lihat
  "USDC"/"wallet"/seed phrase; kunci tetap di user. (passkey smart wallet Soroban)
- **Gasless / fee disponsori** — user tak perlu punya XLM; fee dibayar app/relayer (fee-bump).
- **Penerima nol-friksi** — cukup buka link, tak perlu install/daftar; fee ditanggung relayer.
- **Kirim by kontak / nomor HP**, bukan alamat wallet.
- **Escrow + link claim** dengan expiry & auto-refund (Soroban escrow contract).

### Bikin juri "wow"
- ⭐ **Cash-out tunai** (SEP-24 nyata via SDF Test Anchor; MoneyGram-ready) — bintang demo.
  "Wow moment" paling kuat + alasan teknis memilih Stellar.
- **Transparansi biaya real-time** — kontras "WU −Rp 82.000 vs Kami −Rp 150".
- **Sangu Bulanan** — kiriman rutin otomatis (tunjukkan setup di demo).

### Visi masa depan (JANGAN dibangun, taruh di slide saja)
- Tabungan USD anti-pelemahan Rupiah, kartu debit, **pinjaman mikro berbasis riwayat kiriman**
  (data riwayat sudah kita simpan lewat Soroban sejak awal → fondasinya siap).

### JANGAN dibangun untuk hackathon
- KYC real, lisensi/regulasi, on-ramp fiat real, banyak koridor sekaligus.

---

## 9. Kecocokan Track Hackathon

Produk ini menyentuh **2 dari 3 track** — frame sebagai satu produk, submit ke track terkuat.

- **Track utama — Payment & Consumer Applications ($20k):** persis definisinya, "accessible and
  easy-to-use financial tools for everyday users". Killer flow kita = tool pembayaran konsumen
  paling mudah. **Ini track submission utama.**
- **Track sekunder — Local Finance & Real World Access ($20k):** cash-out tunai untuk unbanked =
  "real-world access" ke uang fisik bagi yang tak tersentuh bank. Ini memperkuat narasi.
- (DeFi & Composability = bukan fokus, tapi fondasi Soroban kita membuka arah ke sana nanti.)

---

## 10. Growth Loop (untuk pitch)

- **Penerima → pengirim:** anggota keluarga yang menerima hari ini bisa merantau besok.
- **Penerima → agen:** warung yang sering mencairkan jadi titik cash-out (agen) di kampung.
- **Konsentrasi komunitas PMI** (mis. Victoria Park HK tiap Minggu) → adopsi word-of-mouth cepat.

---

## 11. Positioning vs Kompetitor

| Aspek | Western Union | Wise / Flip | Morse (Sling) | **Produk kita** |
|---|---|---|---|---|
| Biaya | 6–7% | rendah–sedang | rendah | ~0 (fee disponsori) |
| Kecepatan | 1–2 hari | menit–jam | detik | detik |
| Penerima butuh app/rekening? | tidak (tapi mahal) | **ya** | **ya** | **TIDAK** |
| Cash-out tunai unbanked | ya (mahal) | tidak | tidak | **ya (link + MoneyGram/agen)** |
| Fokus PMI Indonesia | umum | umum | umum | **spesifik** |

**Celah yang kita isi:** murah + instan **DAN** penerima tanpa app/rekening **DAN** bisa tarik
tunai — kombinasi yang tak ada di pemain lain.

---

## 12. Kandidat Nama (diputuskan belakangan)

| Nama | Arti / vibe | Kekuatan |
|---|---|---|
| **Rantau** ⭐ | dari "merantau" — pergi kerja jauh. Persis audiens. | Paling nyambung kultural; tagline nulis sendiri. |
| **Sangu** | Jawa/Sunda: bekal/uang untuk yang pergi. | Hangat, emosional. |
| **Wesel** | wesel pos jadul yang keluarga PMI kenal. | Nostalgia + modern; cerita pitch kuat. |
| **Kirimin** | gaul, "tolong kirimkan". | Jelas & gampang diingat. |
| **Pulang** | uang yang "pulang" ke rumah. | Emosional, satu kata. |

Tagline kandidat (Rantau): **"Kirim pulang, semudah kirim pesan."**

---

## 13. Alur Pengalaman Pengguna (UX)

Prinsip menyeluruh: **kripto tak pernah muncul di layar.** User lihat Rupiah/Ringgit, kontak,
dan tombol besar. Semua istilah wallet/USDC/seed phrase disembunyikan.

### 13.1 Sisi Pengirim (PMI) — app penuh (web/PWA)

**Onboarding (sekali):**
1. Buka app → **"Masuk"** dengan nomor HP + biometrik HP (Face ID / sidik jari).
   - Di balik layar: app membuat/menautkan **akun Stellar** milik pengirim (dikelola app,
     tanpa seed phrase). Biometrik = kunci buka app, bukan seed phrase yang harus dihafal.
2. **Isi saldo** (mock on-ramp untuk hackathon) → saldo tampil sebagai "Rp / RM", di balik
   layar = USDC di akun pengirim.

**Alur kirim (killer flow) — 4 layar:**
1. **Pilih penerima** — dari kontak HP atau ketik nomor. (Bukan alamat wallet.)
2. **Ketik jumlah** — tampil di mata uang pengirim (mis. RM 500).
   - **Transparansi biaya brutal** langsung muncul: *"Penerima terima ± Rp 1.720.000.
     Western Union potong Rp 82.000. Kami: Rp 150."*
3. **Pilih cara penerima cairkan (opsional)** — biarkan penerima yang pilih, atau sarankan:
   DANA / GoPay / bank / **tunai di gerai**.
4. **Konfirmasi (biometrik)** → progress 3–5 detik → **"Terkirim!"** + tombol
   **"Bagikan ke WhatsApp"** yang berisi link claim.

**Setelah kirim:**
- **Riwayat** kiriman (status: menunggu di-claim / sudah cair / dikembalikan).
- **Sangu Bulanan:** tombol "Ulangi tiap tanggal 1" → set kiriman rutin. (Tunjukkan setup di
  demo; tak perlu tunggu tanggalnya benar-benar tiba.)

### 13.2 Sisi Penerima (keluarga) — TANPA app, cukup buka link

Ini **produk sebenarnya** (bagian 5). Target: ibu 55 tahun, HP Android murah, sinyal pas-pasan,
mungkin tanpa rekening. Semua di **browser**, Bahasa Indonesia, tombol besar, minim teks.

1. **Terima pesan WhatsApp:** *"[Nama] mengirimimu Rp 1.720.000. Buka untuk mencairkan 👉 [link]"*
2. **Buka link di browser** → halaman claim: *"Andi mengirimimu Rp 1.720.000."* Tombol besar
   **"Cairkan Sekarang"**.
3. **Verifikasi OTP** — masukkan kode SMS ke nomor ini. *("Aman — hanya kamu yang bisa
   mencairkan.")*
4. **Pilih cara terima:**
   - **DANA / GoPay** → masukkan nomor → cair.
   - **Rekening bank** → nomor rekening → cair.
   - **⭐ Tunai di gerai** → tampil **kode penarikan + peta gerai terdekat** (MoneyGram/agen).
     Bawa KTP + kode → ambil uang tunai. *Untuk yang tak punya rekening sama sekali.*
5. **Selesai:** *"Rp 1.720.000 sedang dikirim ke DANA-mu"* / *"Tunjukkan kode ini di gerai."*

**Penerima berulang ("akun ringan"):** setelah claim pertama, simpan preferensi (mis. selalu
DANA) di PWA ringan/link ter-personalisasi. Bulan depan: buka link → 1 tap → cair.

**Fallback paling unbanked:** untuk sinyal/HP terburuk, alur berbasis **SMS/OTP** murni
(tanpa buka halaman) sebagai opsi darurat.

### 13.3 "Wow moment" demo (klimaks panggung)
Perlihatkan sisi penerima memilih **"Tunai di gerai"** → kode penarikan muncul → narasi:
*"Ibu yang tak punya rekening bank pun bisa ambil uang tunai — jalur cash-out ini hanya ada di
Stellar (MoneyGram Ramps)."* Tutup dengan **transaksi escrow asli di Stellar Explorer**.

> **Demo copy wajib jujur (review):** sebut eksplisit — *"withdrawal SEP-24 nyata; settlement
> IDR/tunai disimulasikan di layer anchor (SDF Test Anchor). MoneyGram = integrasi SEP-24 yang
> sama, pending allowlist partner."* Jangan mengklaim payout Indonesia sudah live.

---

## 14. Arsitektur & Tech Stack (MVP) — Wallet Pengirim & Escrow Non-Custodial

> **Batas non-custodial (jujur, jangan over-claim):**
> - **Non-custodial:** wallet **pengirim** (passkey smart wallet, kunci di user) dan **escrow
>   on-chain** (dana tunduk aturan contract; backend tak memegang key pengirim & tak bisa
>   membelokkan dana ke alamat liar).
> - **Trusted / custodial boundary:** **leg off-ramp**. Backend mengendalikan *kapan* claim
>   dipicu (pasca-OTP), akun **settlement**, memo, dan konversi fiat lewat anchor. Begitu USDC
>   masuk anchor/settlement, itu wilayah terpercaya — sebagaimana semua off-ramp fiat.
>
> Jadi klaimnya: **"wallet pengirim + escrow non-custodial; off-ramp trusted."** Bukan
> "non-custodial penuh". Trade-off all-Soroban (lebih berat vs Claimable Balances) diterima demi
> kedaulatan kunci pengirim + smart-contract + composability.

### 14.1 Model akun

| Aktor | Akun | Custody |
|---|---|---|
| **Pengirim (PMI)** | **Passkey smart wallet Soroban** (`C...`, signer secp256r1 = Face ID/sidik jari) | **Non-custodial** — kunci di perangkat user, tak pernah ke server. |
| **Escrow** | **Soroban escrow contract** memegang USDC (via Stellar Asset Contract) | Trustless — dana tunduk aturan contract, bukan siapa pun. |
| **Penerima** | **Tak perlu wallet.** Dana mengalir ke akun settlement → anchor off-ramp saat claim. | Nol-friksi; penerima tak pernah meng-custody. |
| **Relayer/Backend** | Akun layanan: bayar fee (fee-bump/Launchtube) + submit + picu claim pasca-OTP | Tak bisa mengalihkan dana ke alamat liar (allowlist), **tapi** mengendalikan waktu claim, settlement, memo & leg fiat → **titik trusted**. |

> Kenapa penerima non-custody tak perlu wallet: penerima **tak menyimpan** dana — begitu di-claim,
> USDC mengalir ke settlement → anchor untuk dicairkan. Kedaulatan kunci berlaku penuh di sisi
> **pengirim**; sisi off-ramp adalah batas terpercaya (lihat catatan batas non-custodial di atas).

### 14.2 Komponen sistem

| Komponen | Peran | Stack |
|---|---|---|
| **App Pengirim** | Onboarding passkey, kirim, riwayat, Sangu Bulanan | Next.js + Tailwind + shadcn/ui (PWA) + passkey-kit |
| **Halaman Claim** | Sisi penerima, tanpa app, mobile-first, Bhs Indonesia | Next.js route ringan / PWA |
| **Backend/Relayer** | OTP, mapping link↔escrow, submit & bayar fee tx (relayer), scheduler Sangu Bulanan & refund-keeper, jembatan SEP-24 anchor | Node.js/TS + DB |
| **Stellar Testnet** | Escrow, transfer, riwayat | Soroban RPC + Horizon + friendbot |
| **Soroban Contracts** | Escrow (killer flow) + Registry/Ledger (otak) | Rust |
| **Anchor (off-ramp/cash)** | SEP-24 withdraw ke e-wallet & tunai | **SDF Test Anchor** (identik MoneyGram); MoneyGram-ready |

### 14.3 Peran tiap primitive Stellar

- **Passkey smart wallet (Soroban)** → akun pengirim non-custodial + login biometrik.
- **Soroban escrow contract** → link-claim (hashlock) + expiry/refund (timelock) diberlakukan
  on-chain. Killer flow.
- **Stellar Asset Contract (SAC)** → escrow memegang & memindah USDC di dalam Soroban.
- **Fee-bump / relayer (Launchtube)** → gasless; relayer bayar fee, smart wallet meng-*authorize*.
- **SEP-24 (SDF Test Anchor / MoneyGram Ramps)** → penarikan fiat/tunai (bintang demo).
- **Soroban registry/ledger contract** → profil penerima berulang + riwayat kiriman on-chain
  (fondasi pinjaman mikro, bagian 8).

### 14.4 Skema escrow — Soroban contract (jantung killer flow)

Contract menyimpan tiap transfer:
`{sender, amount, hashlock, recipient_commitment, expiry, status}`.

**`deposit(sender, amount, hashlock, recipient_commitment, expiry)`** — memindah USDC (SAC) ke
contract; butuh `sender.require_auth()`.
- **Non-custodial (penting):** backend **tidak** membelanjakan dana user. Alurnya **2 langkah** —
  backend **menyusun XDR unsigned**, **passkey smart wallet** meng-authorize/sign, lalu di-submit
  (relayer fee-bump). Backend tak pernah pegang key pengirim.
- **`hashlock = sha256(secret)`** di mana **`secret` disimpan BACKEND, TIDAK PERNAH di URL.** Link
  claim hanya membawa **token opaque** (lihat §2.2 spesifikasi teknis).
- **`recipient_commitment`** = komitmen penerima yang **tak dapat direkonstruksi publik** —
  dihitung server-side (**HMAC** dgn kunci rahasia backend), **bukan** `sha256(nomor HP)` (nomor
  HP ruang kecil & brute-force-able). Field ini **tidak** dipakai untuk auth on-chain.

**`claim(escrow_id, secret, payout_destination)`** — syarat on-chain:
- `sha256(secret) == hashlock`, **dan**
- `now < expiry`, **dan**
- `payout_destination ∈ allowlist anchor` (disetel saat deploy) → **tak bisa** dialihkan ke alamat
  liar; hanya ke settlement/anchor sah.
→ contract kirim USDC ke `payout_destination` (akun settlement → jembatan SEP-24 anchor).
Gate manusia = **OTP** (off-chain) sebelum backend memicu claim dgn `secret`. Backend mengendalikan
pemicuan ini → bagian dari **batas trusted off-ramp** (lihat catatan §14 atas).

**`refund()`** — syarat: `now >= expiry`. **Permissionless** — siapa pun boleh memanggil, tapi
dana **hanya** bisa kembali ke `sender`. Jadi refund benar-benar trustless.

> **Soal "auto-refund":** logika refund ada **on-chain** (aturan di contract). "Auto" = sebuah
> **keeper job** di backend yang memanggil `refund()` begitu expiry lewat (Stellar tak punya cron
> on-chain). Karena permissionless & terikat ke sender, keeper tak perlu dipercaya. Ditulis apa
> adanya, bukan diklaim ajaib.

### 14.5 Registry/Ledger contract (otak, layer di atas)

Contract kedua, **tak menghalangi** killer flow:
- **Registry penerima:** kunci = **HMAC server-side** (bukan hash nomor mentah) → preferensi cair. Mendukung "1-tap bulan depan".
- **Ledger riwayat kiriman:** catat tiap transfer (jumlah, waktu, status) → **fondasi pinjaman
  mikro** (data sudah on-chain sejak awal).
- Dibangun **setelah** escrow stabil. Jika waktu mepet, demo inti tetap utuh tanpa ini.

### 14.6 Alur teknis happy-path (ringkas)
```
Pengirim (passkey wallet)      Backend/Relayer + Soroban Testnet     Penerima (browser)
  isi jumlah ───────────────▶  prepare: susun XDR deposit(hashlock,
                               recipient_commitment, expiry) unsigned
  sign (Face ID) ◀──────────── kirim XDR unsigned
  submit signedXDR ─────────▶  fee-bump + submit deposit ──▶ Testnet
  "Terkirim" + link(token)  ◀── simpan secret di DB; link = token opaque
      │ share WA ─────────────────────────────────────────────▶  buka link
                               kirim OTP (SMS) ────────────────▶  masukkan OTP
                          ◀──  verifikasi OTP ok
                               escrow.claim(secret, SETTLEMENT) ─▶ Testnet
                               SEP-24 withdraw (settlement→anchor, ber-memo)
                                                              ─▶  "cair"/"kode" (disimulasikan)
  (jika expiry lewat) → keeper panggil escrow.refund() ─▶ Testnet → USDC balik ke pengirim
```

Catatan: on-chain seluruhnya USDC. `secret` tak pernah di link (hanya token opaque). Konversi ke
IDR & settlement fiat terjadi di **tepi anchor** (trusted), bukan on-chain.

### 14.7 Yang WAJIB real vs boleh MOCK

| Bagian | Status | Catatan |
|---|---|---|
| Escrow Soroban: `deposit` + `claim` + `refund` | **REAL** | Ditunjukkan di Stellar Explorer / Soroban — bukti inti. |
| Passkey smart wallet (login biometrik, non-custodial) | **REAL** | passkey-kit / smart wallet SDK. |
| Gasless via relayer (fee-bump / Launchtube) | **REAL** | Native. |
| **Withdrawal SEP-24 (protokol)** | **REAL** via **SDF Test Anchor** | Alur withdrawal SEP-24 sungguhan. **Membuktikan protokol**, BUKAN ketersediaan payout Indonesia/MoneyGram. |
| **Payout IDR/tunai (DANA/GoPay/gerai)** | **DISIMULASIKAN di layer anchor** | Test Anchor membalas instruksi/kode; settlement fiat Indonesia belum nyata. Demo copy wajib jujur. |
| OTP verifikasi nomor penerima | **REAL** (SMS sandbox) | Provider SMS bisa sandbox. |
| Soroban registry/riwayat | **REAL bila sempat** | Layer di atas; opsional untuk demo inti. |
| **Rate FX (RM & HKD → IDR)** | **REAL rate, tapi REFERENSI** | Dari FX API sungguhan. `feeIdr` & perbandingan WU = **ESTIMASI/DEMO** — wajib dilabeli + sumber + timestamp. Bukan kurs remittance final. |
| On-ramp (isi saldo pengirim) | **MOCK** | Danai smart wallet dengan USDC test. |
| MoneyGram Ramps asli | **PENDING allowlist** | Email partner sejak awal; swap-in bila keburu. |
| KYC, lisensi | **MOCK** | Jalur produksi di slide. |

### 14.8 Stack konkret (ringkas)
- **Chain:** Stellar **Testnet** (Soroban RPC + Horizon + friendbot).
- **Contracts:** Rust + `stellar-cli` (dulu `soroban-cli`); Soroban SDK.
- **Smart wallet:** passkey-kit (smart wallet secp256r1) untuk pengirim.
- **SDK klien:** `@stellar/stellar-sdk` + Soroban JS bindings; relayer via Launchtube/fee-bump.
- **Stablecoin:** USDC (aset test di testnet) via SAC.
- **Frontend:** Next.js + Tailwind + shadcn/ui (pengirim PWA + halaman claim ringan).
- **Backend/Relayer:** Node.js/TS (OTP + relayer submit/fee + scheduler + jembatan SEP-24) + DB.
- **Cash-out:** SEP-24 terhadap **SDF Test Anchor** (referensi: `stellar/moneygram-access-wallet-mvp`).
- **Kurs/FX:** FX rate API real (RM→IDR, HKD→IDR) untuk display & perhitungan payout.

---

## 15. Keputusan Terkunci & Sisa Terbuka

**Terkunci:**
- ✅ **Rail:** Stellar Testnet, **non-custodial / all-Soroban**.
- ✅ **Koridor demo:** **Malaysia (RM) + Hong Kong (HKD)**.
- ✅ **Cash-out:** **SDF Test Anchor (SEP-24)** dulu; MoneyGram Ramps paralel (allowlist).
- ✅ **Kurs/FX:** **REAL** (FX rate API).
- ✅ **Track submission:** **Payment & Consumer Applications**.
- ✅ **Eksekusi:** **paralel** — ada anggota tim khusus mengerjakan **contract (Soroban/Rust)**;
  sisanya (frontend pengirim, halaman claim, backend/relayer, integrasi anchor) jalan bareng.

**Sisa terbuka:**
- ⏳ **Nama final** — didiskusikan dengan tim (placeholder: "Rantau").
- ⏳ **Kontrak antar-bagian** — sebelum paralel, kunci *interface* contract (signature
  `deposit`/`claim`/`refund`, tipe data hashlock/expiry) agar frontend & backend nyambung dengan
  hasil kerja developer contract. **Ini prioritas langkah berikutnya.**

---

## 16. Langkah Berikutnya (eksekusi paralel)

**Langkah 0 — kunci kontrak antar-bagian (WAJIB sebelum paralel).**
Sepakati *interface* contract escrow supaya tim contract & tim app tak saling tunggu:
- `deposit(sender, amount, hashlock: BytesN<32>, recipient_commitment: BytesN<32>, expiry: u64) -> escrow_id`
  (dipanggil via XDR yang di-sign passkey — backend tak spend dana user)
- `claim(escrow_id, secret: Bytes, payout_destination: Address)` (destination = settlement allowlist)
- `refund(escrow_id)`
- Event/return yang di-emit tiap fungsi + daftar `allowlist` anchor.

**Lalu 4 jalur paralel:**
1. **Contract (teman kamu):** escrow Soroban (`deposit`/`claim`/`refund`, hashlock+timelock,
   allowlist anchor) → nanti Registry/Ledger.
2. **Frontend pengirim:** passkey smart wallet + alur kirim + transparansi biaya (kurs live) +
   Sangu Bulanan.
3. **Halaman claim penerima:** buka link → OTP → pilih cair → status. Bhs Indonesia, tombol besar.
4. **Backend/relayer + anchor:** OTP, mapping link↔escrow, submit+fee-bump tx, integrasi
   **SEP-24 SDF Test Anchor**, FX rate API, keeper refund/scheduler.

**Paralel administratif:** email partner MoneyGram untuk allowlist sejak hari-1.

**Penutup:** integrasi end-to-end (kirim→claim→cash-out+refund) + pitch deck (angka pasar + demo
+ "kenapa Stellar" + non-custodial + visi).
