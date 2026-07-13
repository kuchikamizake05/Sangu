import type { ComponentType, SVGProps } from "react";
import styles from "./landing.module.css";
import { Reveal } from "./reveal";
import { ChatIcon, ClockIcon, MapPinIcon } from "./icons";

const ITEMS: { Icon: ComponentType<SVGProps<SVGSVGElement>>; title: string; copy: string }[] = [
  { Icon: ClockIcon, title: "Kapan pun", copy: "Bantuan 24/7 dalam bahasa Indonesia. Jam 2 pagi di rantau pun kami bangun." },
  { Icon: MapPinIcon, title: "Di mana pun", copy: "Dari Kuala Lumpur, Hong Kong, Taipei, sampai Riyadh — selama ada internet, ada Sangu." },
  { Icon: ChatIcon, title: "Apa pun pertanyaannya", copy: "Dari cara klaim sampai soal kurs, tanya saja. Tidak ada pertanyaan yang terlalu sepele." },
];

export function Support() {
  return <section className={styles.supportSection}>
    <div className={styles.container}>
      <Reveal><h2 className={styles.sectionTitle}>Ditemani, bukan ditinggal.</h2></Reveal>
      <div className={styles.supportGrid}>
        {ITEMS.map((item) => <Reveal key={item.title}>
          <div className={styles.supportCol}>
            <span className={styles.supportIcon}><item.Icon width={24} height={24} /></span>
            <h3>{item.title}</h3>
            <p>{item.copy}</p>
          </div>
        </Reveal>)}
      </div>
    </div>
  </section>;
}
