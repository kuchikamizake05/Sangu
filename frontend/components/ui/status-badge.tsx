import { useT } from "@/lib/i18n/locale-context";
import styles from "./status-badge.module.css";
type TransferStatus = "PENDING" | "CLAIMED" | "PAID_OUT" | "REFUNDED" | "EXPIRED";
const items: Record<TransferStatus, { labelKey:string; tone:"neutral" | "success" | "danger" }> = { PENDING:{labelKey:"common.status.pending",tone:"neutral"}, CLAIMED:{labelKey:"common.status.claimed",tone:"neutral"}, PAID_OUT:{labelKey:"common.status.paidOut",tone:"success"}, REFUNDED:{labelKey:"common.status.refunded",tone:"success"}, EXPIRED:{labelKey:"common.status.expired",tone:"danger"} };
export function StatusBadge({ status }: { status: TransferStatus }) { const t=useT(); const item=items[status]; return <span className={`${styles.badge} ${styles[item.tone]}`} data-tone={item.tone}>{t(item.labelKey)}</span>; }
