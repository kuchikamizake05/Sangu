import styles from "./status-badge.module.css";
type TransferStatus = "PENDING" | "CLAIMED" | "PAID_OUT" | "REFUNDED" | "EXPIRED";
const labels: Record<TransferStatus, { label:string; tone:"neutral" | "success" | "danger" }> = { PENDING:{label:"Menunggu dicairkan",tone:"neutral"}, CLAIMED:{label:"Sedang diproses",tone:"neutral"}, PAID_OUT:{label:"Sudah dicairkan",tone:"success"}, REFUNDED:{label:"Dikembalikan",tone:"success"}, EXPIRED:{label:"Sudah kedaluwarsa",tone:"danger"} };
export function StatusBadge({ status }: { status: TransferStatus }) { const item=labels[status]; return <span className={`${styles.badge} ${styles[item.tone]}`} data-tone={item.tone}>{item.label}</span>; }
