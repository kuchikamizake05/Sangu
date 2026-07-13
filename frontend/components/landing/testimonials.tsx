import styles from "./landing.module.css";
import { Reveal } from "./reveal";

type Card =
  | { kind: "quote"; text: string; by: string; flag: string }
  | { kind: "photo"; by: string; gradient: string };

const CARDS: Card[] = [
  { kind: "quote", text: "Dulu nunggu akhir pekan buat antre di counter. Sekarang sambil rebahan, sangu sudah sampai.", by: "Sari", flag: "🇲🇾 MY" },
  { kind: "photo", by: "Yanti", gradient: "linear-gradient(160deg,#5d7f9e,#233848 80%)" },
  { kind: "quote", text: "Ibu di Wonosobo tinggal buka link, uangnya langsung masuk. Nggak perlu ngajarin aplikasi.", by: "Yanti", flag: "🇭🇰 HK" },
  { kind: "quote", text: "Gajian tanggal 25, tanggal 25 juga sampai di rumah. Sangu Bulanan jalan sendiri.", by: "Budi", flag: "🇲🇾 MY" },
  { kind: "photo", by: "Rina", gradient: "linear-gradient(160deg,#a2727e,#43242c 80%)" },
  { kind: "quote", text: "Yang kukirim, itu yang diterima. Nggak ada potongan aneh-aneh di tengah jalan.", by: "Rina", flag: "🇹🇼 TW" },
  { kind: "quote", text: "Passkey-nya bikin tenang. Nggak ada password yang bisa dibobol orang.", by: "Dewi", flag: "🇸🇦 SA" },
];

function CardView({ card }: { card: Card }) {
  if (card.kind === "photo") {
    return <div className={styles.commPhoto} style={{ background: card.gradient }} aria-hidden="true"><span className={styles.commPhotoBar} /><span className={styles.commPhotoName}>{card.by}</span></div>;
  }
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
