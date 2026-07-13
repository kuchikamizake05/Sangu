# Sangu App — Implementation Plan

Rencana ini melanjutkan implementasi dari kondisi saat ini. Fokusnya adalah menjadikan app
pengirim dan claim siap demo end-to-end, lalu menutup kebutuhan production hardening.

## Status saat ini

Sudah ada: AppShell responsif, route `/send`, `/transfers`, `/transfers/[transferId]`,
`/recurring`, `/account`, flow claim OTP/payout, filter riwayat dasar, dan timeline berbasis
status. Seluruh pekerjaan berikut wajib mempertahankan test yang sudah ada.

## Phase A — Rapikan pengalaman pengirim

### A1. Jadikan `/send` satu-satunya composer transfer

1. Ubah Beranda (`/`) agar hanya menjadi dashboard: saldo, kiriman aktif, riwayat singkat, dan
   CTA ke `/send`.
2. Hapus state composer/wizard dari halaman Beranda setelah CTA sudah mengarah ke `/send`.
3. Pastikan tombol Kirim di Beranda, Riwayat, dan empty state selalu memakai route `/send`.
4. Tambahkan test: CTA pada setiap permukaan mengarah ke `/send`.

**Selesai bila:** wizard hanya hidup di `/send`; refresh halaman tidak memunculkan dashboard dan
composer secara bersamaan.

### A2. Optimalkan wizard untuk desktop dan mobile

1. Pecah wizard kirim menjadi komponen langkah penerima, nominal/quote, payout preference, dan
   review supaya mudah diuji.
2. Pada desktop, letakkan `QuoteSummary` sticky di kolom kanan mulai langkah nominal.
3. Pada mobile, simpan `QuoteSummary` tepat setelah input nominal dan sebelum CTA lanjut.
4. Tambahkan status loading/error yang konsisten untuk quote dan prepare transfer.
5. Tambahkan E2E prepare transfer hingga receipt dengan API mock.

**Selesai bila:** nominal diterima, fee, kurs, dan estimasi tiba selalu terlihat sebelum passkey.

### A3. Navigation state

1. Turunkan path aktif pada `AppShell`.
2. Tambahkan state aktif pada sidebar desktop dan bottom navigation mobile.
3. Tambahkan `aria-current="page"` pada item aktif.
4. Test active state di setiap route utama.

**Selesai bila:** pengguna selalu tahu halaman aktif tanpa bergantung pada warna saja.

## Phase B — Lengkapi claim penerima

### B1. OTP yang tahan gagal

1. Tambahkan countdown resend (mis. 60 detik) setelah OTP dikirim.
2. Nonaktifkan tombol kirim ulang sampai countdown habis; tampilkan sisa waktu secara aksesibel.
3. Setelah OTP salah, pertahankan input dan tampilkan error inline.
4. Tambahkan test untuk validasi 6 digit, OTP gagal, resend cooldown, dan retry jaringan.

**Selesai bila:** penerima tidak dapat mengirim OTP berulang-ulang dan selalu mengetahui langkah
pemulihan saat kode/koneksi bermasalah.

### B2. Hasil payout yang dapat digunakan

1. Tambahkan tombol salin pada kode cash-out beserta status sukses/gagal salin.
2. Jika backend mengirim data gerai, tampilkan nama gerai, alamat singkat, dan tautan peta.
3. Untuk payout digital, tampilkan metode, nominal, dan status proses yang eksplisit.
4. Tambahkan state khusus link invalid, expired, claimed, paid out, dan refunded.
5. Tambahkan E2E cash payout dan expired link.

**Selesai bila:** penerima dapat menyelesaikan pencairan atau memahami alasan link tidak dapat
digunakan tanpa menghubungi dukungan.

## Phase C — Kontrak backend untuk recurring dan riwayat

### C1. Tambahkan API recurring

Backend perlu menyediakan endpoint berikut sebelum UI penuh dibuat:

```text
GET    /api/recurring
PATCH  /api/recurring/:recurringId
POST   /api/recurring/:recurringId/pause
POST   /api/recurring/:recurringId/resume
DELETE /api/recurring/:recurringId
```

Setiap jadwal minimal memiliki `recurringId`, penerima termask, koridor, nominal, tanggal,
status `ACTIVE | PAUSED`, dan `nextRunAt`.

### C2. Tambahkan detail/event transfer

Backend perlu menyediakan:

```text
GET /api/transfers/:transferId
```

Respons minimal: ringkasan transfer dan event `{ type, occurredAt }` untuk dibuat, deposit/escrow,
claimed, paid out, refunded, expired. Ini menggantikan timeline UI yang saat ini diturunkan dari
status saja.

**Selesai bila:** frontend tidak perlu menyimpulkan timestamp maupun status akhir dari daftar
transfer.

## Phase D — Pengelolaan recurring dan riwayat penuh

### D1. Sangu Bulanan

1. Tampilkan daftar jadwal aktif dan dijeda.
2. Tambahkan edit nominal/tanggal/penerima.
3. Tambahkan aksi jeda, lanjutkan, dan hapus dengan dialog konfirmasi.
4. Jelaskan aturan passkey di setiap jadwal dan tampilkan waktu kirim berikutnya.
5. Tambahkan component test untuk semua aksi serta E2E pengaturan jadwal.

### D2. Riwayat dan detail event nyata

1. Tambahkan filter lengkap: Semua, Menunggu, Diproses, Selesai, Dikembalikan, Kedaluwarsa.
2. Gunakan endpoint detail transfer untuk event timeline nyata.
3. Tambahkan empty state berbeda untuk filter kosong dan riwayat benar-benar kosong.
4. Tambahkan notif in-app ketika status transfer berubah.

**Selesai bila:** pengirim dapat memahami seluruh perjalanan uang dan mengelola kiriman rutin tanpa
workaround.

## Phase E — Akun, aksesibilitas, dan PWA

### E1. Akun dan perangkat

1. Hubungkan “Kelola perangkat” ke daftar passkey/perangkat yang benar-benar tersedia dari backend
   atau wallet SDK.
2. Tambahkan konfirmasi sebelum menghapus perangkat.
3. Sambungkan bantuan ke kanal dukungan yang disetujui produk.

### E2. Accessibility audit

1. Audit keyboard: urutan fokus, modal, route change, dan CTA sticky.
2. Audit screen reader: live region untuk OTP, status transfer, dan hasil cash-out.
3. Audit kontras warna dan touch target 44px.
4. Tambahkan test aksesibilitas ke komponen berisiko tinggi.

### E3. PWA dan performa

1. Tambahkan manifest, icon, dan install metadata.
2. Definisikan cache aman: cache aset statis saja; jangan cache respons claim, OTP, quote, atau
   transfer.
3. Pastikan skeleton muncul untuk request awal dan tidak ada image besar yang memblokir UI.

## Phase F — Production hardening

1. Tambahkan E2E: send sukses, passkey ditolak, submit status tidak diketahui, OTP salah, cash
   payout, expired link, dan network failure.
2. Jalankan coverage; target minimal 80% untuk lib dan komponen flow kritis.
3. Selesaikan observability: API failure, error boundary, dan funnel events tanpa data sensitif.
4. Tetapkan Content Security Policy setelah domain API/analytics/font produksi final.
5. Jalankan build, unit test, E2E, audit dependency, dan review security sebelum release.

## Urutan eksekusi yang direkomendasikan

1. A1 → A2 → A3
2. B1 → B2
3. C1 → C2 (backend dapat berjalan paralel)
4. D1 → D2 setelah kontrak C tersedia
5. E1 → E3
6. F

Jangan membuat UI yang mensimulasikan pause/edit/hapus recurring atau event timestamp bila backend
belum menyediakan kontraknya. Gunakan state yang jujur sampai integrasi tersedia.
