import type { HTMLAttributes } from "react";
import styles from "./card.module.css";
export function Card({ className = "", ...props }: HTMLAttributes<HTMLElement>) { return <section className={`${styles.card} ${className}`} {...props} />; }
