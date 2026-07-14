"use client";

import { Button } from "@/components/ui/button";
import { TextInput } from "@/components/ui/field";
import type { Corridor, PayoutMethod } from "@/lib/api";
import { CORRIDORS, CORRIDOR_ORDER } from "@/lib/corridors";
import { useT } from "@/lib/i18n/locale-context";
import { isE164Phone } from "@/lib/send-flow";

const corridorChoices: Array<{ value: Corridor; flag: string; label: string; suffix: string }> = CORRIDOR_ORDER.map(
  (value) => ({ value, flag: CORRIDORS[value].flag, label: CORRIDORS[value].country, suffix: `→ ${CORRIDORS[value].symbol}` }),
);

export function RecipientStep({
  corridor,
  phone,
  methodHint,
  onCorridorChange,
  onPhoneChange,
  onMethodChange,
  onContinue,
}: {
  corridor: Corridor;
  phone: string;
  methodHint: PayoutMethod | null;
  onCorridorChange: (value: Corridor) => void;
  onPhoneChange: (value: string) => void;
  onMethodChange: (value: PayoutMethod | null) => void;
  onContinue: () => void;
}) {
  const t = useT();
  const phoneValid = isE164Phone(phone);
  const payoutChoices: Array<{ value: PayoutMethod; label: string }> = [
    { value: "dana", label: "DANA" },
    { value: "gopay", label: "GoPay" },
    { value: "bank", label: t("send.payoutBank") },
    { value: "cash", label: t("send.payoutCash") },
  ];

  return (
    <div className="grid gap-6 px-1 pb-6 pt-2">
      <div>
        <h1 className="text-2xl font-extrabold tracking-[-.05em]">{t("send.recipientHeading")}</h1>
        <p className="mt-1 text-sm text-muted">{t("send.recipientSubheading")}</p>
      </div>

      <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label={t("send.corridorAria")}>
        {corridorChoices.map((choice) => (
          <button
            type="button"
            key={choice.value}
            role="radio"
            aria-checked={corridor === choice.value}
            onClick={() => onCorridorChange(choice.value)}
            className={`rounded-2xl border p-4 text-left transition ${corridor === choice.value ? "border-brand bg-peach" : "border-line hover:border-ink"}`}
          >
            <span className="text-2xl" aria-hidden="true">{choice.flag}</span>
            <strong className="mt-2 block text-base">{choice.label}</strong>
            <span className="text-sm text-muted">{choice.suffix}</span>
          </button>
        ))}
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-bold text-ink" htmlFor="recipient-phone">{t("send.phoneLabel")}</label>
        <TextInput
          id="recipient-phone"
          inputMode="tel"
          placeholder="+62812xxxxxxx"
          value={phone}
          onChange={(event) => onPhoneChange(event.target.value)}
        />
        {phone.length > 0 && !phoneValid && (
          <p className="mt-1.5 text-xs font-semibold text-danger">{t("send.phoneInvalid")}</p>
        )}
      </div>

      <div>
        <p className="mb-2 text-sm font-bold text-ink">{t("send.payoutMethodTitle")}</p>
        <div className="flex flex-wrap gap-2" role="group" aria-label={t("send.payoutMethodAria")}>
          {payoutChoices.map((choice) => {
            const selected = methodHint === choice.value;
            return (
              <button
                type="button"
                key={choice.value}
                aria-pressed={selected}
                onClick={() => onMethodChange(selected ? null : choice.value)}
                className={`rounded-[14px] border px-4 py-2 text-sm font-bold transition ${selected ? "border-brand bg-peach text-brand-deep" : "border-line text-ink hover:border-ink"}`}
              >
                {choice.label}
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-xs text-muted">{t("send.payoutMethodNote")}</p>
      </div>

      <Button fullWidth onClick={onContinue} disabled={!phoneValid}>{t("send.continueButton")}</Button>
    </div>
  );
}
