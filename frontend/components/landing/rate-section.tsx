"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useT } from "@/lib/i18n/locale-context";
import styles from "./landing.module.css";
import { Reveal } from "./reveal";
import { CheckIcon, ChevronDownIcon } from "./icons";

type Currency = { code: string; flag: string; labelKey: string; fallbackToIdr: number };

const CURRENCIES: Currency[] = [
  { code: "USD", flag: "🇺🇸", labelKey: "usd", fallbackToIdr: 16250 },
  { code: "MYR", flag: "🇲🇾", labelKey: "myr", fallbackToIdr: 3685 },
  { code: "HKD", flag: "🇭🇰", labelKey: "hkd", fallbackToIdr: 2110 },
  { code: "JPY", flag: "🇯🇵", labelKey: "jpy", fallbackToIdr: 105 },
];

const TIMEZONE_CURRENCY: Record<string, string> = {
  "Asia/Kuala_Lumpur": "MYR", "Asia/Kuching": "MYR",
  "Asia/Hong_Kong": "HKD", "Asia/Macau": "HKD",
  "Asia/Tokyo": "JPY",
};

function detectCurrency(): string {
  try {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return TIMEZONE_CURRENCY[timezone] ?? "USD";
  } catch { return "USD"; }
}

function CurrencyPicker({ code, onChange }: { code: string; onChange: (code: string) => void }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const currency = CURRENCIES.find((c) => c.code === code) ?? CURRENCIES[0];

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => { if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false); };
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => { document.removeEventListener("pointerdown", onPointerDown); document.removeEventListener("keydown", onKeyDown); };
  }, [open]);

  return <div ref={rootRef} className={styles.ccy}>
    <button type="button" className={`${styles.ccyBtn} ${open ? styles.ccyBtnOpen : ""}`} aria-label={t("landing.rateSection.ccyButtonAria")} aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
      <span className={styles.calcFlag} aria-hidden="true">{currency.flag}</span>{currency.code}
      <span className={styles.ccyChevron}><ChevronDownIcon /></span>
    </button>
    {open && <div className={styles.ccyMenu} role="listbox" aria-label={t("landing.rateSection.ccyMenuAria")}>
      <p className={styles.ccyLabel}>{t("landing.rateSection.ccyMenuLabel")}</p>
      {CURRENCIES.map((c) => <button key={c.code} type="button" role="option" aria-selected={c.code === code} className={`${styles.ccyItem} ${c.code === code ? styles.ccyItemActive : ""}`} onClick={() => { onChange(c.code); setOpen(false); }}>
        <span className={styles.calcFlag} aria-hidden="true">{c.flag}</span>
        <span><strong>{c.code}</strong><small>{t(`landing.rateSection.currencies.${c.labelKey}`)}</small></span>
        {c.code === code && <span className={styles.ccyCheck}><CheckIcon /></span>}
      </button>)}
    </div>}
  </div>;
}

export function RateSection() {
  const t = useT();
  const [code, setCode] = useState("USD");
  const [amount, setAmount] = useState("500");
  const [liveRate, setLiveRate] = useState<number | null>(null);

  useEffect(() => { setCode(detectCurrency()); }, []);

  useEffect(() => {
    let cancelled = false;
    setLiveRate(null);
    fetch(`https://open.er-api.com/v6/latest/${code}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => { if (!cancelled && typeof data?.rates?.IDR === "number") setLiveRate(data.rates.IDR); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [code]);

  const currency = CURRENCIES.find((c) => c.code === code) ?? CURRENCIES[0];
  const rate = liveRate ?? currency.fallbackToIdr;
  const parsedAmount = Number.parseFloat(amount.replace(",", ".")) || 0;
  const result = useMemo(() => new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(Math.round(parsedAmount * rate)), [parsedAmount, rate]);

  return <section id="kurs" className={styles.rateBand}>
    <div className={`${styles.container} ${styles.rateGrid}`}>
      <Reveal>
        <h2 className={styles.sectionTitle}>{t("landing.rateSection.title")}</h2>
        <p className={styles.sectionSub}>{t("landing.rateSection.sub")}</p>
        <div className={styles.heroCtas} style={{ justifyContent: "flex-start", marginTop: 30 }}>
          <a className={`${styles.pill} ${styles.pillLarge}`} href="/app">{t("landing.rateSection.ctaPrimary")}</a>
        </div>
      </Reveal>
      <Reveal>
        <div className={styles.calcCard}>
          <h3 className={styles.calcTitle}>{t("landing.rateSection.calcTitle")}</h3>
          <div className={styles.calcRow}>
            <span className={styles.calcMeta}>
              <small>{t("landing.rateSection.fromLabel")}</small>
              <CurrencyPicker code={code} onChange={setCode} />
            </span>
            <input className={styles.calcAmount} inputMode="decimal" aria-label={`${t("landing.rateSection.amountAriaLabel")} ${t(`landing.rateSection.currencies.${currency.labelKey}`)}`} value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.,]/g, ""))} />
          </div>
          <div className={styles.calcRateRow}><span>{t("landing.rateSection.marketRateLabel")}</span><strong>1 {code} ≈ {new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 }).format(rate)} IDR</strong></div>
          <div className={styles.calcRow}>
            <span className={styles.calcMeta}>
              <small>{t("landing.rateSection.toLabel")}</small>
              <span className={styles.ccyStatic}><span className={styles.calcFlag} aria-hidden="true">🇮🇩</span>IDR</span>
            </span>
            <span className={styles.calcResult}>{result}</span>
          </div>
          <a className={styles.calcLink} href={`https://www.google.com/search?q=${code}+to+IDR`} target="_blank" rel="noreferrer">{t("landing.rateSection.compareLink")}</a>
        </div>
      </Reveal>
    </div>
  </section>;
}
