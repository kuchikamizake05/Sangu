import styles from "./landing.module.css";
import { Reveal } from "./reveal";

const FEATURES = [
  { title: "Sampai dalam hitungan detik", copy: "Jaringan Stellar menyelesaikan transfermu dalam ±5 detik — bukan 3–5 hari kerja. Kirim malam ini, keluarga terima malam ini juga.", cta: "Kirim uang", href: "/app", background: "#ffe7d4", cards: [{ label: "Transfer ke Ibu", detail: "Baru saja", badge: "Sampai" }, { label: "Rp 1.842.500", detail: "±5 detik", badge: "Selesai" }] },
  { title: "Kuncinya milikmu, bukan milik kami", copy: "Sangu non-custodial: kunci tersimpan sebagai passkey di perangkatmu. Tidak ada yang bisa membekukan atau memakai uangmu — termasuk kami.", cta: "Pelajari passkey", href: "#keamanan", background: "#dcf1ff", cards: [{ label: "Passkey perangkat ini", detail: "Face ID / sidik jari", badge: "Aktif" }, { label: "Kustodian pihak ketiga", detail: "Tidak ada", badge: "0" }] },
  { title: "Sangu Bulanan, jalan otomatis", copy: "Atur sekali di tanggal gajian, dan tiap bulan sangu berangkat sendiri. Ubah atau hentikan kapan pun, tanpa penalti.", cta: "Atur jadwal", href: "/app", background: "#fff0c8", cards: [{ label: "Tiap tanggal 25", detail: "RM 500 → Ibu", badge: "Aktif" }, { label: "Berikutnya", detail: "25 Juli 2026", badge: "Terjadwal" }] },
  { title: "Keluarga klaim tanpa aplikasi", copy: "Penerima cukup membuka link aman di browser mana pun. Tanpa install, tanpa daftar akun, tanpa ribet — langsung klaim.", cta: "Coba kirim link", href: "/app", background: "#ffe8f9", cards: [{ label: "Link klaim terkirim", detail: "Berlaku 24 jam", badge: "Menunggu" }, { label: "Diklaim Ibu", detail: "Tanpa aplikasi", badge: "Sukses" }] },
];

export function Features() {
  return <section className={styles.section} aria-label="Fitur Sangu">
    <div className={styles.container}>
      <Reveal className={styles.center}><h2 className={styles.sectionTitle}>Semua urusan sangu, satu tempat.</h2></Reveal>
      {FEATURES.map((feature, i) => <Reveal key={feature.title}>
        <div className={`${styles.feature} ${i % 2 === 1 ? styles.featureFlip : ""}`}>
          <div>
            <h3>{feature.title}</h3>
            <p>{feature.copy}</p>
            <a className={styles.pillDark} href={feature.href}>{feature.cta}</a>
          </div>
          <div className={styles.featureVisual} style={{ background: feature.background }}>
            <div className={styles.miniCards}>
              {feature.cards.map((card) => <div key={card.label} className={styles.miniCard}><span>{card.label}<small>{card.detail}</small></span><span className={styles.miniBadge}>{card.badge}</span></div>)}
            </div>
          </div>
        </div>
      </Reveal>)}
    </div>
  </section>;
}
