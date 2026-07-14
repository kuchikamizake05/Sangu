import Image, { type StaticImageData } from "next/image";
import styles from "./landing.module.css";
import { Reveal } from "./reveal";
import kirimUangImg from "@/asset/fitur/kirim-uang.png";
import kunciImg from "@/asset/fitur/kunci.png";
import sanguBulananImg from "@/asset/fitur/sangu-bulanan.png";
import keluargaKlaimImg from "@/asset/fitur/keluarga-klaim2.png";

type Feature = { title: string; copy: string; cta: string; href: string; background: string; image: StaticImageData; alt: string };

const FEATURES: Feature[] = [
  { title: "Sampai dalam hitungan detik", copy: "Transfermu selesai dalam ±5 detik — bukan 3–5 hari kerja. Kirim malam ini, keluarga terima malam ini juga.", cta: "Kirim uang", href: "/app", background: "#ffe7d4", image: kirimUangImg, alt: "Pengguna mengirim uang ke berbagai mata uang lewat aplikasi." },
  { title: "Kuncinya milikmu, bukan milik kami", copy: "Kunci keamanan uangmu tersimpan di perangkatmu sendiri, dibuka dengan sidik jari atau wajah. Tidak ada yang bisa membekukan atau memakai uangmu — termasuk kami.", cta: "Pelajari keamanannya", href: "#keamanan", background: "#dcf1ff", image: kunciImg, alt: "Layar pengaturan keamanan dan sidik jari di ponsel." },
  { title: "Sangu Bulanan, jalan otomatis", copy: "Atur sekali di tanggal gajian, dan tiap bulan sangu berangkat sendiri. Ubah atau hentikan kapan pun, tanpa penalti.", cta: "Atur jadwal", href: "/app", background: "#fff0c8", image: sanguBulananImg, alt: "Layar mengirim nominal sangu secara terjadwal." },
  { title: "Keluarga klaim tanpa aplikasi", copy: "Penerima cukup membuka link aman di browser mana pun. Tanpa install, tanpa daftar akun, tanpa ribet — langsung klaim.", cta: "Coba kirim link", href: "/app", background: "#ffe8f9", image: keluargaKlaimImg, alt: "Ibu di Indonesia menerima transfer instan lewat link." },
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
            <Image src={feature.image} alt={feature.alt} fill sizes="(max-width: 900px) 100vw, 50vw" className={styles.featurePhoto} />
          </div>
        </div>
      </Reveal>)}
    </div>
  </section>;
}
