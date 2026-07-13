import { cloneElement, isValidElement, useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from "react";
import styles from "./field.module.css";
export function Field({ label,hint,children }: { label:string; hint?:string; children:ReactNode }) {
  const id = useId();
  const control = isValidElement<{ id?: string }>(children) ? cloneElement(children, { id }) : children;
  return <div className={styles.field}><label htmlFor={id}>{label}</label>{control}{hint && <small>{hint}</small>}</div>;
}
export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) { return <input className={styles.input} {...props} />; }
export function SelectInput(props: SelectHTMLAttributes<HTMLSelectElement>) { return <select className={styles.input} {...props} />; }
