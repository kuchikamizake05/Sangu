# Sangu App — Product Design Specification

Dokumen ini menetapkan desain end-to-end untuk aplikasi remitansi Sangu: aplikasi pengirim,
riwayat, kiriman rutin, dan halaman claim penerima. Landing/marketing tidak termasuk di sini.

## 1. Arah Produk

Sangu adalah aplikasi **kirim uang pulang**, bukan aplikasi trading atau dompet kripto.
Pengirim di Malaysia/Hong Kong harus bisa memahami tiga hal dalam beberapa detik: berapa yang
dikirim, berapa yang diterima keluarga, dan kapan uang dapat dicairkan.

### Prinsip

- **Transparan sebelum berkomitmen.** Kurs, biaya, nominal penerima, dan estimasi waktu selalu
  muncul sebelum pengguna menandatangani transaksi.
- **Satu tugas utama per layar.** Alur kirim dan claim tidak menumpuk pilihan yang belum relevan.
- **Bahasa keluarga, bukan blockchain.** Jangan tampilkan XDR, gas, escrow, Soroban, atau relayer
  pada permukaan pengguna.
- **Mobile-first tanpa mengorbankan desktop.** HP adalah pengalaman utama; desktop mendapat ruang
  kerja yang lebih kaya, bukan versi HP yang diregangkan.
- **Aman tetapi menenangkan.** Status, error, dan persetujuan biometrik menerangkan apa yang
  terjadi dan tindakan pemulihannya.

### Referensi desain

- **Utama — Wise:** transparansi kurs/biaya dan ringkasan transfer yang mudah dipindai.
- **Pendukung — Remitly:** bahasa remitansi yang personal, pilihan payout, serta pelacakan status.
- **Hindari:** pola aplikasi trading—grafik harga, dark terminal, ticker aset, dan data padat.

Sangu meminjam pola informasi tersebut, bukan merek, aset, atau identitas visual mereka.

## 2. Lingkup dan Struktur Informasi

### Permukaan pengirim

| Halaman | Tujuan | Route yang disarankan |
|---|---|---|
| Beranda | melihat saldo, aksi kirim, dan kiriman aktif | `/` |
| Kirim uang | membuat dan mengonfirmasi transfer | `/send` |
| Riwayat | melihat, menyaring, dan membuka transfer | `/transfers` |
| Detail transfer | melacak satu transfer dan membagikan ulang link | `/transfers/[transferId]` |
| Sangu Bulanan | membuat serta mengelola kiriman rutin | `/recurring` |
| Akun & keamanan | status passkey, preferensi, bantuan | `/account` |

### Permukaan penerima

| Halaman | Tujuan | Route |
|---|---|---|
| Claim | menerima informasi transfer, OTP, payout, hasil | `/claim/[token]` |

Claim harus mandiri: tidak ada sidebar, saldo pengirim, atau navigasi aplikasi. Penerima tidak
perlu akun maupun instalasi aplikasi.

## 3. Layout Responsif

### Mobile: 320–767px

- Canvas satu kolom, padding sisi `16px`; konten maksimal `640px`.
- Header ringkas: wordmark, kemudian satu aksi kontekstual jika diperlukan.
- Navigasi bawah untuk **Beranda**, **Riwayat**, **Bulanan**, dan **Akun**. Tombol **Kirim uang**
  adalah CTA menonjol di Beranda serta tombol tetap di bagian bawah ketika relevan.
- Wizard kirim dan claim memakai satu kolom dengan CTA full-width yang tetap terlihat di area
  bawah layar.
- Tidak ada tabel horizontal. Riwayat tampil sebagai kartu yang dapat disentuh.

### Tablet: 768–1023px

- Konten maksimal `920px`, padding `24px–32px`.
- Beranda dapat memakai dua kolom untuk kartu saldo dan aksi kirim.
- Ringkasan transfer boleh berada di samping form bila ruang tersedia; jika tidak, kembali ke
  bawah form tanpa mengubah urutan informasi.

### Desktop: ≥1024px

- Shell dua area: sidebar tetap `240px`, area kerja maksimum `1120px`.
- Sidebar berisi wordmark dan item Beranda, Kirim uang, Riwayat, Sangu Bulanan, Akun.
- Halaman Kirim menggunakan grid `minmax(0, 1fr) 360px`: form di kiri, ringkasan kurs/biaya
  sticky di kanan.
- Detail transfer boleh memakai panel informasi dan timeline berdampingan; setiap tindakan tetap
  dapat dilakukan hanya dengan keyboard.

### Aturan adaptasi

- Target sentuh minimum `44 × 44px`; input minimum tinggi `48px`.
- Breakpoint hanya mengubah susunan, bukan menghilangkan informasi kritis.
- CTA primer tidak boleh bersaing dengan lebih dari satu CTA primer lain pada satu viewport.
- Claim tetap lebar maksimal `520px` pada semua ukuran layar agar terasa fokus dan aman.

## 4. Sistem Visual

Fondasi token mengikuti `docs/morsemoney.com-DESIGN.md`, dengan penerapan khusus aplikasi:

| Peran | Token | Pemakaian |
|---|---|---|
| Canvas | `#FCFCFC` | latar halaman |
| Surface | `#FFFFFF` | kartu dan sheet |
| Teks utama | `#080808` | heading, angka, label |
| Teks pendukung | `#676767` | metadata dan bantuan |
| Primary | `#FF5113` | CTA kirim/cairkan dan fokus interaktif |
| Primary soft | `#FFE7D4` | informasi positif/non-kritis |
| Success | `#57CE43` | selesai/dibayar, selalu dengan teks atau ikon |
| Danger | `#F03406` | error dan tindakan destruktif |
| Divider | `#EDEDED` | pemisah dan batas netral |

- Font: `Haffer` bila tersedia; fallback `Avenir Next`, `Segoe UI`, lalu sans-serif sistem.
- Angka uang menggunakan `font-variant-numeric: tabular-nums` agar tidak bergeser.
- Heading layar aplikasi: `28–36px` mobile, `36–48px` desktop; hindari headline marketing
  berukuran `72px` di area kerja.
- Kartu utama radius `30–48px`, kartu daftar radius `20–24px`, tombol pill radius `999px`.
- Bayangan hanya untuk modal, dropdown, dan panel sticky; bukan untuk semua elemen.

## 5. Komponen Bersama

| Komponen | Perilaku yang wajib |
|---|---|
| `AppShell` | sidebar desktop, bottom nav mobile, area konten dengan landmark semantik |
| `Button` | primary, secondary, ghost, destructive; loading dan disabled state |
| `MoneyInput` | mata uang sebagai prefix/suffix, input string/desimal aman, formatting saat blur |
| `QuoteSummary` | nominal dikirim, nominal diterima, fee, kurs, sumber/waktu kurs, estimasi tiba |
| `StatusBadge` | PENDING, CLAIMED, PAID_OUT, REFUNDED, EXPIRED; selalu teks + warna |
| `TransferTimeline` | langkah dibuat, escrow, claim, payout/refund, timestamp dan status kini |
| `RecipientCard` | nama/nomor ter-mask, metode payout, aksi pilih/edit |
| `OtpInput` | enam digit, paste didukung, error, countdown/resend |
| `PayoutMethodCard` | DANA, GoPay, bank, tunai; detail dan ketersediaan |
| `Toast` | sukses/error nonblokir; tidak menggantikan error inline pada form |
| `Dialog` | konfirmasi tindakan destruktif, retry aman, dan keluar dari flow |
| `LoadingState` | skeleton untuk data awal; spinner hanya untuk aksi singkat |
| `EmptyState` | penjelasan singkat dan satu CTA yang jelas |

## 6. Pengalaman Pengirim

### 6.1 Onboarding passkey

1. Layar pembuka menerangkan: “Masuk dengan perangkatmu. Kunci tetap milikmu.”
2. CTA **Siapkan akses perangkat** memulai registrasi/tautkan passkey.
3. Selama proses tampilkan langkah: menyiapkan → menunggu verifikasi perangkat → berhasil.
4. Jika perangkat tidak mendukung passkey, tampilkan alasan dan fallback yang benar-benar tersedia;
   jangan memberi kesan biometric sudah aktif bila masih demo.
5. Selesai onboarding membawa pengguna ke Beranda.

### 6.2 Beranda

Urutan informasi:

1. Salam singkat dan tombol notifikasi.
2. Kartu saldo: nominal, mata uang, ekuivalen IDR, label sumber saldo/demo bila relevan.
3. CTA primer **Kirim uang**.
4. Kartu “Kiriman aktif” untuk transfer yang belum selesai, dengan status dan CTA lihat detail.
5. Riwayat terbaru (maksimal tiga), lalu tautan **Lihat semua**.
6. Kartu Sangu Bulanan yang menunjukkan jadwal berikutnya atau CTA mengatur jadwal.

### 6.3 Kirim uang

Alur inti terdiri dari empat langkah. Pengguna dapat kembali tanpa kehilangan data; CTA lanjut tidak
aktif bila data belum valid.

1. **Penerima:** pilih penerima tersimpan atau masukkan nomor WhatsApp E.164. Nomor di-mask setelah
   validasi; error berada tepat di bawah input.
2. **Jumlah dan koridor:** pilih Malaysia/Hong Kong, masukkan nominal, lalu ambil quote. Quote
   menampilkan nominal IDR yang diterima, biaya, kurs, sumber/timestamp, dan estimasi tiba.
3. **Cara cair:** pilih DANA, GoPay, bank, atau tunai di gerai sebagai preferensi penerima.
4. **Tinjau:** ringkas semua data, expiry, dan peringatan bahwa transaksi belum dikirim.

Di desktop, `QuoteSummary` tetap di kolom kanan mulai langkah dua. Di mobile, ia muncul langsung
di bawah input nominal lalu sebelum CTA lanjut.

### 6.4 Konfirmasi passkey dan receipt

Setelah `prepare` berhasil:

1. Tampilkan sheet konfirmasi dengan nominal, penerima, dan status “Siap dikonfirmasi”.
2. Status aksi berurutan: **Menyiapkan transaksi → Menunggu biometrik → Mengirim → Terkirim**.
3. Penolakan biometric kembali ke state aman untuk mencoba lagi; jangan membuat transfer baru.
4. Bila hasil submit tidak diketahui, tampilkan “Kami sedang mengecek status transfer” dan arahkan
   ke detail transfer; jangan menawarkan submit ulang.
5. Receipt menampilkan nominal, status, claim link, serta CTA **Bagikan ke WhatsApp**. Gunakan Web
   Share API, lalu fallback salin link.

### 6.5 Riwayat dan detail transfer

Riwayat memiliki filter: Semua, Menunggu dicairkan, Diproses, Selesai, Dikembalikan, Kedaluwarsa.
Setiap item memuat nominal IDR, penerima termask, tanggal, dan badge status.

Detail transfer memuat:

- `TransferTimeline` beserta timestamp yang tersedia;
- penerima termask dan metode pencairan;
- ringkasan jumlah, kurs, fee, ID transfer, serta expiry;
- claim link dan aksi share ulang selama status masih `PENDING`;
- tindakan sesuai status: lihat instruksi, hubungi bantuan, atau buat transfer baru.

### 6.6 Sangu Bulanan

Halaman ini memisahkan jadwal aktif dan jadwal dijeda. Membuat jadwal membutuhkan penerima,
koridor, nominal, tanggal bulanan, dan konfirmasi. Setiap jadwal mempunyai menu **Ubah**,
**Jeda/Lanjutkan**, dan **Hapus**. Hapus selalu memakai dialog konfirmasi dan menjelaskan bahwa
transfer yang telah dibuat tidak ikut dibatalkan.

Karena setiap transfer mungkin perlu passkey, UI harus menjelaskan apakah jadwal akan meminta
otorisasi saat jatuh tempo atau apakah kebijakan on-chain telah mengizinkan eksekusi otomatis.

## 7. Pengalaman Claim Penerima

### 7.1 Memuat dan validasi link

Layar awal memuat nama pengirim, nominal IDR besar, status, dan CTA **Cairkan sekarang**.
Gunakan skeleton saat data diambil. Untuk token tidak valid, expired, sudah diclaim, atau transfer
telah dikembalikan, tampilkan satu penjelasan, status jelas, dan CTA bantuan bila tersedia.

### 7.2 OTP

1. Tombol claim meminta OTP dan berpindah ke layar kode.
2. Layar menjelaskan bahwa kode enam digit dikirim ke nomor penerima yang termask.
3. Resend hanya aktif setelah countdown; kegagalan OTP tidak menghapus input sebelum pengguna
   mencoba lagi.
4. Jika koneksi gagal, tampilkan retry yang aman. Jangan menyebut token, nomor lengkap, atau detail
   teknis pada error.

### 7.3 Payout dan hasil

Penerima memilih salah satu metode: DANA, GoPay, bank, atau **Tunai di gerai**. Detail rekening/
nomor diminta hanya saat metode itu dipilih. Untuk cash, layar hasil menjadi klimaks:

- heading “Kode penarikan”;
- kode besar dengan tombol salin;
- instruksi singkat dan lokasi/tautan peta gerai bila backend menyediakannya;
- status pencairan dan bantuan.

Untuk payout digital, hasil menunjukkan status “Sedang dikirim ke …”, nominal, dan estimasi
penyelesaian. Bila payout masih simulasi pada demo, label demo harus jelas namun tidak mengganggu
alur utama.

## 8. State, Error, dan Ketahanan

| Situasi | Perlakuan UI |
|---|---|
| Quote gagal | pertahankan nominal; tampilkan retry di dekat quote |
| Form tidak valid | validasi inline setelah blur/submit, fokus ke field pertama yang salah |
| Passkey ditolak | jelaskan bahwa transaksi belum dikirim; CTA coba lagi |
| Submit timeout | status belum diketahui; arahkan cek detail, tidak boleh resubmit otomatis |
| OTP salah | pesan inline, input tetap dapat diperbaiki |
| Link claim invalid/expired | status statis, tanpa CTA pencairan |
| Riwayat kosong | edukasi singkat dan CTA kirim pertama |
| Jaringan lemah | skeleton untuk loading awal, retry eksplisit untuk aksi gagal |

## 9. Aksesibilitas, Keamanan, dan Observability

- Semua input memiliki label eksplisit; ikon tanpa teks memiliki `aria-label`.
- Fokus keyboard terlihat dan urutannya sesuai layar. Modal mengunci fokus dan dapat ditutup dengan
  Escape bila aman.
- Kontras teks/CTA minimal WCAG AA; status tidak hanya dibedakan oleh warna.
- Nominal, kode cash-out, dan pesan status dibaca jelas oleh screen reader melalui live region.
- Tidak ada secret, private key, relayer credential, nomor telepon lengkap, atau token claim yang
  dicatat ke telemetry klien.
- Error tracking hanya mengirim jenis error, sumber, waktu, dan konteks non-sensitif.
- Gunakan security headers aplikasi; Content Security Policy ditambahkan setelah seluruh domain
  font, analytics, dan API produksi telah ditetapkan.

## 10. Format Data dan Bahasa

- Bahasa default: Indonesia sederhana dan langsung.
- Mata uang pengirim: `RM 1,840.00` atau `HK$ 1,840.00`; penerima: `Rp 1.720.000`.
- Jangan menggunakan `Number`/float sebagai sumber kebenaran nominal; API dan state finansial
  memakai string desimal terformat.
- Waktu tampil dalam zona lokal pengguna dengan label relatif bila membantu, misalnya “Hari ini,
  14.30”.
- Nomor telepon dan rekening dimasking di daftar/detail kecuali saat pengguna memang sedang
  mengeditnya.

## 11. Indikator Keberhasilan dan Acceptance Criteria

Desain dianggap siap diimplementasikan bila:

1. Pengirim dapat menyelesaikan transfer dari Beranda sampai receipt tanpa melihat istilah teknis
   blockchain.
2. Setiap langkah transfer memperlihatkan informasi biaya dan nominal penerima yang dibutuhkan.
3. Penerima dapat menyelesaikan claim dari link hingga payout/cash code hanya dengan browser mobile.
4. Desktop memakai sidebar dan panel summary tanpa mengubah task flow mobile.
5. Semua state `PENDING`, `CLAIMED`, `PAID_OUT`, `REFUNDED`, dan `EXPIRED` memiliki bahasa,
   warna, dan tindakan lanjutan yang eksplisit.
6. Error passkey, submit, OTP, link invalid, dan jaringan lemah memiliki pemulihan aman.
7. Detail desain ini dapat dipakai sebagai acuan route, komponen, E2E, dan audit aksesibilitas.
