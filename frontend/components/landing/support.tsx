"use client";

import type { ComponentType, SVGProps } from "react";
import { useT } from "@/lib/i18n/locale-context";
import styles from "./landing.module.css";
import { Reveal } from "./reveal";
import { ChatIcon, ClockIcon, MapPinIcon } from "./icons";

const ITEMS: { Icon: ComponentType<SVGProps<SVGSVGElement>>; key: string }[] = [
  { Icon: ClockIcon, key: "anytime" },
  { Icon: MapPinIcon, key: "anywhere" },
  { Icon: ChatIcon, key: "anything" },
];

export function Support() {
  const t = useT();
  return <section className={styles.supportSection}>
    <div className={styles.container}>
      <Reveal><h2 className={styles.sectionTitle}>{t("landing.support.title")}</h2></Reveal>
      <div className={styles.supportGrid}>
        {ITEMS.map((item) => <Reveal key={item.key}>
          <div className={styles.supportCol}>
            <span className={styles.supportIcon}><item.Icon width={24} height={24} /></span>
            <h3>{t(`landing.support.items.${item.key}.title`)}</h3>
            <p>{t(`landing.support.items.${item.key}.copy`)}</p>
          </div>
        </Reveal>)}
      </div>
    </div>
  </section>;
}
