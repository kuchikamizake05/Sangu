# Login — Pemilih Negara untuk Nomor HP

## Tujuan

Memudahkan pekerja migran Indonesia mendaftar atau masuk menggunakan nomor yang
aktif mereka pakai, baik nomor Indonesia maupun nomor negara tempat mereka tinggal.
Nomor telepon hanya dipakai untuk OTP dan identitas akun; nomor tersebut tidak
menentukan koridor maupun mata uang pengiriman.

## Pengalaman pengguna

Di langkah nomor HP pada halaman login, satu input diganti menjadi dua bagian:

- Pemilih negara di kiri, berisi bendera, nama negara, dan kode panggilan.
- Input nomor lokal di kanan, dengan keypad telepon di perangkat mobile.

Daftar awal memprioritaskan koridor PMI: Indonesia (+62), Malaysia (+60), Hong
Kong (+852), Taiwan (+886), Arab Saudi (+966), Singapura (+65), UEA (+971), Korea
Selatan (+82), Jepang (+81), Brunei (+673), dan Thailand (+66). Pemilih negara
menyediakan opsi “Negara lain” agar daftar dapat diperluas tanpa mengubah flow.

## Normalisasi nomor

Sebelum request OTP atau passkey login, frontend membentuk satu nomor E.164:

- Nomor lokal dibersihkan dari spasi, tanda hubung, dan karakter nonangka.
- Awalan trunk `0` dihapus bila ada: `0812…` dengan Indonesia menjadi
  `+62812…`; `012…` dengan Malaysia menjadi `+6012…`.
- Paste nomor lengkap berawalan `+` mengenali kode negara dari daftar dan mengisi
  pemilih negara serta input lokal secara otomatis.
- Jika kode negara tidak dikenali, nilai lengkap tetap dikirim hanya jika lolos
  validasi E.164 yang ada; jika tidak, tampilkan error yang jelas.

Nomor yang dibawa ke API tetap satu nilai E.164 sesuai kontrak auth, sehingga
backend tidak perlu berubah.

## Aksesibilitas dan responsif

- Pemilih negara adalah tombol/menu dengan label aksesibel “Kode negara”.
- Input lokal berlabel “Nomor HP” dan memakai `inputMode="tel"`.
- Pada layar kecil kedua bagian tetap satu baris; tombol kode memiliki lebar tetap
  dan input menggunakan ruang tersisa.
- Bendera hanya dekoratif (`aria-hidden`); nama negara dan kode dibaca pembaca
  layar.

## Pengujian

- Pemilihan Malaysia + `0123456789` menghasilkan request `+60123456789`.
- Pemilihan Indonesia + `081234567890` menghasilkan request `+6281234567890`.
- Paste `+85212345678` memilih Hong Kong dan memisahkan nomor lokal.
- Pengguna tetap dapat meminta OTP dan masuk memakai nomor yang telah dinormalisasi.
