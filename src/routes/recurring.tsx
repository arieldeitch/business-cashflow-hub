import { createFileRoute } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { Repeat, Pencil, Trash2, Plus } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import {
  useFinance,
  fmt,
  fmtDate,
  financeStore,
  FREQ_LABELS,
  type RecurringExpense,
  type RecurringFrequency,
} from "@/lib/finance-store";

export const Route = createFileRoute("/recurring")({
  head: () => ({ meta: [{ title: "הוצאות קבועות — Cashflow OS" }] }),
  component: RecurringScreen,
});

const CATEGORIES = ["שכירות", "תוכנה", "תקשורת", "ייעוץ", "ביטוח", "חשמל", "אחר"];
const FREQUENCIES: RecurringFrequency[] = ["monthly", "quarterly", "yearly"];
const VAT_RATE = 0.17;

function defaultNextDueDate() {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().slice(0, 10);
}

type FormMode = "closed" | "add" | string; // string = id being edited

function RecurringScreen() {
  const { recurringExpenses } = useFinance();

  const [formMode, setFormMode] = useState<FormMode>("closed");
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [vatExempt, setVatExempt] = useState(false);
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [frequency, setFrequency] = useState<RecurringFrequency>("monthly");
  const [nextDueDate, setNextDueDate] = useState(defaultNextDueDate);

  const amountBeforeVat = Number(amount) || 0;
  const vatAmount = vatExempt ? 0 : Math.round(amountBeforeVat * VAT_RATE);
  const amountIncludingVat = amountBeforeVat + vatAmount;

  const openAdd = () => {
    setName("");
    setAmount("");
    setVatExempt(false);
    setCategory(CATEGORIES[0]);
    setFrequency("monthly");
    setNextDueDate(defaultNextDueDate());
    setFormMode("add");
  };

  const openEdit = (exp: RecurringExpense) => {
    setName(exp.name);
    setAmount(String(exp.amountBeforeVat));
    setVatExempt(exp.vatExempt);
    setCategory(exp.category);
    setFrequency(exp.frequency);
    setNextDueDate(exp.nextDueDate);
    setFormMode(exp.id);
  };

  const closeForm = () => setFormMode("closed");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amountBeforeVat || !name) return;
    const payload = { name, amountBeforeVat, vatExempt, category, frequency, nextDueDate };
    if (formMode === "add") {
      financeStore.addRecurring(payload);
    } else {
      financeStore.updateRecurring(formMode, payload);
    }
    closeForm();
  };

  const handleDelete = (id: string) => {
    if (window.confirm("למחוק את ההוצאה הקבועה?")) {
      financeStore.deleteRecurring(id);
    }
  };

  return (
    <AppShell title="הוצאות קבועות" subtitle="חודשיות · רבעוניות · שנתיות">
      {/* Add button */}
      {formMode === "closed" && (
        <button
          onClick={openAdd}
          className="mb-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-primary/40 bg-primary/5 py-3 text-sm font-semibold text-primary transition active:scale-[0.98]"
        >
          <Plus className="h-4 w-4" />
          הוסף הוצאה קבועה
        </button>
      )}

      {/* Inline form */}
      {formMode !== "closed" && (
        <form
          onSubmit={submit}
          className="mb-5 rounded-3xl border border-border bg-surface p-5 space-y-4"
        >
          <h3 className="font-display text-base font-semibold">
            {formMode === "add" ? "הוצאה קבועה חדשה" : "עריכת הוצאה קבועה"}
          </h3>

          {/* Name */}
          <Field label="שם ההוצאה">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="לדוגמה: שכירות משרד"
              className="w-full bg-transparent text-base font-medium outline-none placeholder:text-muted-foreground/60"
              autoFocus
            />
          </Field>

          {/* Amount */}
          <Field label="סכום לפני מע״מ">
            <div className="flex items-baseline gap-1">
              <input
                inputMode="decimal"
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
                className="w-full bg-transparent font-display text-2xl font-bold tabular outline-none placeholder:text-muted-foreground/40"
              />
              <span className="font-display text-lg text-muted-foreground">₪</span>
            </div>
            {amountBeforeVat > 0 && (
              <div className="mt-2 space-y-0.5 border-t border-border/40 pt-2 text-xs text-muted-foreground">
                {!vatExempt && (
                  <div className="flex justify-between">
                    <span>מע״מ (17%)</span>
                    <span className="tabular">{fmt(vatAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-semibold text-foreground">
                  <span>סה״כ כולל מע״מ</span>
                  <span className="tabular">{fmt(amountIncludingVat)}</span>
                </div>
              </div>
            )}
          </Field>

          {/* VAT exempt toggle */}
          <label className="flex cursor-pointer items-center justify-between">
            <span className="text-sm font-medium">פטור ממע״מ</span>
            <button
              type="button"
              role="switch"
              aria-checked={vatExempt}
              onClick={() => setVatExempt((v) => !v)}
              className={`relative h-6 w-11 rounded-full transition-colors ${vatExempt ? "bg-primary" : "bg-muted"}`}
            >
              <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${vatExempt ? "translate-x-5" : "translate-x-0.5"}`} />
            </button>
          </label>

          {/* Category */}
          <Field label="קטגוריה">
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(c)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
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

          {/* Frequency */}
          <Field label="תדירות">
            <div className="flex gap-2">
              {FREQUENCIES.map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFrequency(f)}
                  className={`flex-1 rounded-xl border py-2 text-xs font-semibold transition ${
                    frequency === f
                      ? "border-primary bg-primary/15 text-primary"
                      : "border-border bg-surface-elevated text-muted-foreground"
                  }`}
                >
                  {FREQ_LABELS[f]}
                </button>
              ))}
            </div>
          </Field>

          {/* Next due date */}
          <Field label="תאריך חיוב הבא">
            <input
              type="date"
              value={nextDueDate}
              onChange={(e) => setNextDueDate(e.target.value)}
              className="w-full bg-transparent text-base font-medium outline-none [color-scheme:dark]"
            />
          </Field>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={closeForm}
              className="flex-1 rounded-xl border border-border py-2.5 text-sm font-semibold text-muted-foreground transition active:scale-[0.98]"
            >
              ביטול
            </button>
            <button
              type="submit"
              disabled={!amount || !name}
              className="flex-1 rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition active:scale-[0.98] disabled:opacity-40"
            >
              שמור
            </button>
          </div>
        </form>
      )}

      {/* Empty state */}
      {recurringExpenses.length === 0 && formMode === "closed" && (
        <div className="rounded-2xl border border-border bg-surface p-8 text-center">
          <Repeat className="mx-auto h-8 w-8 text-muted-foreground/40" />
          <p className="mt-3 text-sm font-medium text-muted-foreground">אין הוצאות קבועות</p>
          <p className="mt-1 text-xs text-muted-foreground/60">
            הוסף הוצאות כמו שכירות, רואה חשבון, אינטרנט או ביטוח עסק.
          </p>
        </div>
      )}

      {/* List */}
      {recurringExpenses.length > 0 && (
        <ul className="space-y-2">
          {recurringExpenses.map((exp) => (
            <li
              key={exp.id}
              className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-3"
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-destructive/15 text-destructive">
                <Repeat className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{exp.name}</p>
                <p className="text-xs text-muted-foreground">
                  {exp.category} · {FREQ_LABELS[exp.frequency]} · ב-{fmtDate(exp.nextDueDate)}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1.5">
                <p className="font-display text-sm font-semibold tabular">
                  {fmt(exp.amount)}
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEdit(exp)}
                    className="flex items-center gap-1 rounded-full border border-border bg-surface-elevated px-2 py-0.5 text-[10px] font-medium text-muted-foreground transition hover:border-primary hover:text-primary"
                  >
                    <Pencil className="h-2.5 w-2.5" />
                    ערוך
                  </button>
                  <button
                    onClick={() => handleDelete(exp.id)}
                    className="flex items-center gap-1 rounded-full border border-border bg-surface-elevated px-2 py-0.5 text-[10px] font-medium text-muted-foreground transition hover:border-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-2.5 w-2.5" />
                    מחק
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block rounded-2xl border border-border bg-surface-elevated px-4 py-3">
      <span className="block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}
