import { useNavigate } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { financeStore, fmt, type TxType } from "@/lib/finance-store";

interface Props {
  type: TxType;
  partyLabel: string;
  dateLabel: string;
  categories?: string[];
  accentClass: string;
  title: string;
}

const VAT_RATE = 0.17;

export function TxForm({ type, partyLabel, dateLabel, categories, accentClass, title }: Props) {
  const navigate = useNavigate();
  const [amount, setAmount] = useState("");
  const [vatExempt, setVatExempt] = useState(false);
  const [party, setParty] = useState("");
  const [category, setCategory] = useState(categories?.[0] ?? "");
  const [date, setDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().slice(0, 10);
  });
  const [saved, setSaved] = useState(false);

  const amountBeforeVat = Number(amount) || 0;
  const vatAmount = vatExempt ? 0 : Math.round(amountBeforeVat * VAT_RATE);
  const amountIncludingVat = amountBeforeVat + vatAmount;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amountBeforeVat || !party) return;
    financeStore.addTransaction({
      type,
      amountBeforeVat,
      vatExempt,
      party,
      category: categories ? category : undefined,
      date,
    });
    setSaved(true);
    setTimeout(() => navigate({ to: "/transactions" }), 600);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex min-h-screen max-w-[480px] flex-col">
        <header className="flex items-center gap-3 px-5 pt-8 pb-2">
          <Link
            to="/"
            className="grid h-10 w-10 place-items-center rounded-full border border-border bg-surface"
          >
            <ChevronRight className="h-5 w-5" />
          </Link>
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              חדש
            </p>
            <h1 className="font-display text-2xl font-semibold">{title}</h1>
          </div>
        </header>

        <form onSubmit={submit} className="flex flex-1 flex-col px-5 pb-10 pt-4">
          {/* Amount hero */}
          <div className={`rounded-3xl border border-border bg-surface p-6 text-center ${accentClass}`}>
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              סכום לפני מע״מ
            </p>
            <div className="mt-3 flex items-baseline justify-center gap-1">
              <input
                inputMode="decimal"
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
                className="w-full bg-transparent text-center font-display text-5xl font-bold tabular outline-none placeholder:text-muted-foreground/40"
                autoFocus
              />
              <span className="font-display text-3xl text-muted-foreground">₪</span>
            </div>

            {/* VAT breakdown */}
            {amountBeforeVat > 0 && (
              <div className="mt-4 space-y-1 border-t border-border/40 pt-3 text-sm">
                {!vatExempt && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>מע״מ (17%)</span>
                    <span className="tabular">{fmt(vatAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-semibold">
                  <span>סה״כ כולל מע״מ</span>
                  <span className="tabular">{fmt(amountIncludingVat)}</span>
                </div>
              </div>
            )}
          </div>

          <div className="mt-5 space-y-3">
            {/* VAT exempt toggle */}
            <label className="flex cursor-pointer items-center justify-between rounded-2xl border border-border bg-surface px-4 py-3">
              <span className="text-sm font-medium">פטור ממע״מ</span>
              <button
                type="button"
                role="switch"
                aria-checked={vatExempt}
                onClick={() => setVatExempt((v) => !v)}
                className={`relative h-6 w-11 rounded-full transition-colors ${
                  vatExempt ? "bg-primary" : "bg-muted"
                }`}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                    vatExempt ? "translate-x-5" : "translate-x-0.5"
                  }`}
                />
              </button>
            </label>

            <Field label={partyLabel}>
              <input
                value={party}
                onChange={(e) => setParty(e.target.value)}
                placeholder={type === "income" ? "לדוגמה: Wix" : "לדוגמה: בזק"}
                className="w-full bg-transparent text-base font-medium outline-none placeholder:text-muted-foreground/60"
              />
            </Field>

            {categories && (
              <Field label="קטגוריה">
                <div className="-mx-1 flex flex-wrap gap-2">
                  {categories.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCategory(c)}
                      className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                        category === c
                          ? "border-primary bg-primary/15 text-primary"
                          : "border-border bg-surface-elevated text-muted-foreground"
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </Field>
            )}

            <Field label={dateLabel}>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-transparent text-base font-medium outline-none [color-scheme:dark]"
              />
            </Field>
          </div>

          <div className="mt-auto pt-8">
            <button
              type="submit"
              className="w-full rounded-2xl bg-primary py-4 font-display text-base font-semibold text-primary-foreground shadow-[0_8px_24px_-6px_oklch(0.82_0.16_162/0.4)] transition active:scale-[0.98] disabled:opacity-40"
              disabled={!amount || !party}
            >
              {type === "income" ? "שמור הכנסה" : "שמור הוצאה"}
            </button>
          </div>
        </form>
      </div>

      {/* Success toast */}
      {saved && (
        <div className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex justify-center">
          <div className="rounded-2xl bg-success px-6 py-3 text-sm font-semibold text-white shadow-lg">
            ✓ נשמר בהצלחה
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block rounded-2xl border border-border bg-surface px-4 py-3">
      <span className="block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}
