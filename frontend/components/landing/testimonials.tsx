import styles from "./landing.module.css";
import { Reveal } from "./reveal";

type Card = { text: string; by: string; flag: string };

const CARDS: Card[] = [
  { text: "Dulu nunggu akhir pekan buat antre di counter. Sekarang sambil rebahan, sangu sudah sampai.", by: "Sari", flag: "🇲🇾 MY" },
  { text: "Transfer tengah malam pun tetap sampai. Beda zona waktu, uang tetap masuk dalam hitungan detik.", by: "Fitri", flag: "🇸🇬 SG" },
  { text: "Ibu di Wonosobo tinggal buka link, uangnya langsung masuk. Nggak perlu ngajarin aplikasi.", by: "Yanti", flag: "🇭🇰 HK" },
  { text: "Gajian tanggal 25, tanggal 25 juga sampai di rumah. Sangu Bulanan jalan sendiri.", by: "Budi", flag: "🇲🇾 MY" },
  { text: "Sekali atur jadwal, tiap bulan berangkat otomatis. Aku nggak pernah lupa kirim sangu lagi.", by: "Hendra", flag: "🇦🇪 AE" },
  { text: "Yang kukirim, itu yang diterima. Nggak ada potongan aneh-aneh di tengah jalan.", by: "Rina", flag: "🇹🇼 TW" },
  { text: "Passkey-nya bikin tenang. Nggak ada password yang bisa dibobol orang.", by: "Dewi", flag: "🇸🇦 SA" },
];

function CardView({ card }: { card: Card }) {
  return <figure className={styles.commCard}>
    <blockquote>{card.text}</blockquote>
    <figcaption className={styles.commFoot}><span>{card.by}</span><span className={styles.commFlag}>{card.flag}</span></figcaption>
  </figure>;
}

export function Testimonials() {
  return <section className={styles.community} aria-label="Testimoni komunitas">
    <div className={styles.container}>
      <Reveal className={styles.center}>
        <h2 className={styles.sectionTitle}>Kata komunitas perantau</h2>
        <p className={styles.sectionSub}>Dibuat untuk yang hidup, kerja, dan berpenghasilan lintas negara.</p>
      </Reveal>
    </div>
    <div className={styles.commMarquee}>
      <div className={styles.commTrack}>
        {[0, 1].map((copy) => CARDS.map((card, i) => <div key={`${copy}-${i}`} aria-hidden={copy === 1 || undefined} style={{ display: "contents" }}><CardView card={card} /></div>))}
      </div>
    </div>
  </section>;
}
