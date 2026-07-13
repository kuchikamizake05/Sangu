import type { ButtonHTMLAttributes, ReactNode } from "react";
import styles from "./button.module.css";

type Variant = "primary" | "secondary" | "ghost";
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> { children: ReactNode; variant?: Variant; fullWidth?: boolean; }

export function Button({ children, className = "", fullWidth = false, variant = "primary", ...props }: ButtonProps) {
  return <button className={`${styles.button} ${styles[variant]} ${fullWidth ? styles.fullWidth : ""} ${className}`} data-variant={variant} {...props}>{children}</button>;
}
