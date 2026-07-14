# Sangu — Brand & Design Foundation

Sumber kebenaran: token di `frontend/app/globals.css` (`@theme { ... }`). Semua tampilan
(app, landing, komponen) harus memakai token ini, bukan hex mentah.

## Palet

| Token | Hex | Peran |
| --- | --- | --- |
| `--color-ink` | `#080808` | Teks utama, kartu saldo/uang gelap |
| `--color-muted` | `#676767` | Teks sekunder / hint |
| `--color-canvas` | `#fcfcfc` | Latar halaman |
| `--color-surface` | `#ffffff` | Latar kartu/panel |
| `--color-line` | `#ededed` | Border netral, divider |
| `--color-brand` | `#ff5113` | Aksi utama (oranye Sangu) |
| `--color-brand-hover` | `#ff7437` | Hover/active state brand |
| `--color-brand-deep` | `#9e1d0e` | Label/eyebrow kecil, teks aksen brand di atas latar terang |
| `--color-peach` | `#ffe7d4` | Wash brand untuk kartu/badge terpilih |
| `--color-peach-wash` | `#fff4eb` | Wash brand lebih pudar (badge, info kecil) |
| `--color-success` | `#278f35` | Ikon/teks status berhasil |
| `--color-success-wash` | `#eaf8e8` | Latar status berhasil |
| `--color-success-ink` | `#356f3b` | Teks di atas `success-wash` |
| `--color-danger` | `#c72307` | Error, alert |
| `--color-danger-wash` | `#fff0ed` | Latar error ringan |
| `--radius-card` | `30px` | Radius kartu |

## Aturan pakai

- **Satu aksi utama per layar** memakai `brand` (oranye penuh). Jangan pakai `brand` untuk
  lebih dari satu tombol/CTA yang bersaing dalam satu layar.
- **`brand-deep`** hanya untuk eyebrow/label kecil (huruf kapital, tracking lebar) atau teks
  aksen kecil di atas latar terang — bukan untuk tombol atau blok besar.
- **Kartu ink gelap** (`bg-ink` + teks putih) dipakai khusus untuk menampilkan uang/saldo
  (mis. kartu saldo, ringkasan jumlah terkirim) agar angka uang selalu punya kontras tertinggi
  di layar.
- Status berhasil pakai pasangan `success` / `success-wash` / `success-ink`; status gagal pakai
  `danger` / `danger-wash`. Jangan campur pasangan token dari family lain untuk status.

## Tipografi

- Font utama: **Plus Jakarta Sans** (`--font-sans`, dimuat via `next/font/google` di
  `app/layout.tsx`, weight 400–800).
- Angka saldo/nominal uang besar: ukuran ±48px, weight 800, tracking ketat (negatif,
  mis. `tracking-[-.06em]` sampai `tracking-[-.07em]`).
- **Semua angka uang wajib pakai `tabular-nums`** supaya digit tidak "melompat" lebar saat
  berubah (saldo, jumlah kirim, jumlah diterima, kode OTP/penarikan).

## Radius

- Kartu: `30px` (`--radius-card`, class `rounded-[30px]` atau util `.card` yang sudah pakai
  var ini).
- Tombol: pill penuh (`--radius-button: 999px`, `rounded-full`).

## Voice (Bahasa Indonesia)

- Nada hangat, jelas, dan langsung — seperti bicara ke keluarga, bukan bahasa perbankan formal.
- Selalu turunkan ke kalimat pendek dan konkret: "Uang pulang, tanpa urusan ribet.",
  "Kirim link aman ke keluarga."
- **NOL kosakata kripto di layar pengguna.** Dilarang muncul di UI (termasuk label, tooltip,
  pesan error): `wallet`, `USDC`, `XDR`, `sign`, `seed`, `on-chain`, dan istilah teknis blockchain
  lainnya. Ganti dengan istilah produk: "akses perangkat" (bukan wallet), "konfirmasi dengan
  biometrik" (bukan sign), "transfer disiapkan" (bukan unsigned XDR), dst.
