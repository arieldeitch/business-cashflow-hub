import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo, type ReactNode } from "react";
import { CreditCard, Pencil, Trash2, Plus } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import {
  useLoans,
  loanStore,
  getTotalLoanBalance,
  getTotalMonthlyLoanPayments,
  getTotalRemainingPayments,
  type Loan,
  type LoanPayload,
} from "@/lib/loan-store";
import { fmt, fmtDate } from "@/lib/finance-store";

export const Route = createFileRoute("/loans")({
  head: () => ({ meta: [{ title: "הלוואות — Cashflow OS" }] }),
  component: LoansScreen,
});

type FormMode = "closed" | "add" | string;

function defaultNextPaymentDate() {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().slice(0, 10);
}

function LoansScreen() {
  const { loans } = useLoans();

  const [formMode, setFormMode] = useState<FormMode>("closed");
  const [name, setName] = useState("");
  const [lender, setLender] = useState("");
  const [remainingBalance, setRemainingBalance] = useState("");
  const [monthlyPayment, setMonthlyPayment] = useState("");
  const [remainingPayments, setRemainingPayments] = useState("");
  const [nextPaymentDate, setNextPaymentDate] = useState(defaultNextPaymentDate);
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const totalBalance = useMemo(() => getTotalLoanBalance(loans), [loans]);
  const totalMonthly = useMemo(() => getTotalMonthlyLoanPayments(loans), [loans]);
  const totalPayments = useMemo(() => getTotalRemainingPayments(loans), [loans]);

  const openAdd = () => {
    setName("");
    setLender("");
    setRemainingBalance("");
    setMonthlyPayment("");
    setRemainingPayments("");
    setNextPaymentDate(defaultNextPaymentDate());
    setNotes("");
    setErrors({});
    setFormMode("add");
  };

  const openEdit = (loan: Loan) => {
    setName(loan.name);
    setLender(loan.lender);
    setRemainingBalance(String(loan.remainingBalance));
    setMonthlyPayment(String(loan.monthlyPayment));
    setRemainingPayments(String(loan.remainingPayments));
    setNextPaymentDate(loan.nextPaymentDate ?? defaultNextPaymentDate());
    setNotes(loan.notes ?? "");
    setErrors({});
    setFormMode(loan.id);
  };

  const closeForm = () => {
    setFormMode("closed");
    setErrors({});
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = "יש להזין שם הלוואה";
    const monthly = Number(monthlyPayment);
    if (!monthlyPayment || isNaN(monthly) || monthly <= 0)
      errs.monthlyPayment = "יש להזין תשלום חודשי גדול מ־0";
    const payments = Number(remainingPayments);
    if (remainingPayments === "" || isNaN(payments) || !Number.isInteger(payments) || payments < 0)
      errs.remainingPayments = "יש להזין מספר תשלומים תקין";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    const payload: LoanPayload = {
      name: name.trim(),
      lender: lender.trim(),
      remainingBalance: Number(remainingBalance) || 0,
      monthlyPayment: Number(monthlyPayment),
      remainingPayments: Number(remainingPayments),
      nextPaymentDate: nextPaymentDate || undefined,
      notes: notes.trim() || undefined,
    };
    if (formMode === "add") {
      loanStore.addLoan(payload);
    } else {
      loanStore.updateLoan(formMode, payload);
    }
    closeForm();
  };

  const handleDelete = (id: string) => {
    if (window.confirm("למחוק את ההלוואה?")) {
      loanStore.deleteLoan(id);
    }
  };

  return (
    <AppShell title="הלוואות" subtitle="מעקב הלוואות עסקיות">
      {/* Summary card */}
      {loans.length > 0 && formMode === "closed" && (
        <div className="mb-4 rounded-3xl border border-border bg-surface p-5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            סה״כ יתרת הלוואות
          </p>
          <p className="mt-1 font-display text-3xl font-bold tabular">{fmt(Math.round(totalBalance))}</p>
          <div className="mt-3 grid grid-cols-2 gap-3 border-t border-border pt-3">
            <div>
              <p className="text-[11px] text-muted-foreground">תשלום חודשי</p>
              <p className="mt-0.5 font-display text-base font-semibold tabular text-destructive">
                {fmt(Math.round(totalMonthly))}
              </p>
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">תשלומים שנותרו</p>
              <p className="mt-0.5 font-display text-base font-semibold tabular">{totalPayments}</p>
            </div>
          </div>
        </div>
      )}

      {/* Add button */}
      {formMode === "closed" && (
        <button
          onClick={openAdd}
          className="mb-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-primary/40 bg-primary/5 py-3 text-sm font-semibold text-primary transition active:scale-[0.98]"
        >
          <Plus className="h-4 w-4" />
          הוסף הלוואה
        </button>
      )}

      {/* Inline form */}
      {formMode !== "closed" && (
        <form
          onSubmit={submit}
          className="mb-5 space-y-4 rounded-3xl border border-border bg-surface p-5"
        >
          <h3 className="font-display text-base font-semibold">
            {formMode === "add" ? "הלוואה חדשה" : "עריכת הלוואה"}
          </h3>

          <Field label="שם הלוואה">
            <>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="לדוגמה: הלוואת עסק"
                className="w-full bg-transparent text-base font-medium outline-none placeholder:text-muted-foreground/60"
                autoFocus
              />
              {errors.name && <p className="mt-1 text-xs text-destructive">{errors.name}</p>}
            </>
          </Field>

          <Field label="בנק / גוף מממן">
            <input
              value={lender}
              onChange={(e) => setLender(e.target.value)}
              placeholder="לדוגמה: בנק הפועלים"
              className="w-full bg-transparent text-base font-medium outline-none placeholder:text-muted-foreground/60"
            />
          </Field>

          <Field label="יתרת הלוואה">
            <div className="flex items-baseline gap-1">
              <input
                inputMode="decimal"
                placeholder="0"
                value={remainingBalance}
                onChange={(e) => setRemainingBalance(e.target.value.replace(/[^0-9.]/g, ""))}
                className="w-full bg-transparent font-display text-2xl font-bold tabular outline-none placeholder:text-muted-foreground/40"
              />
              <span className="font-display text-lg text-muted-foreground">₪</span>
            </div>
          </Field>

          <Field label="תשלום חודשי">
            <>
              <div className="flex items-baseline gap-1">
                <input
                  inputMode="decimal"
                  placeholder="0"
                  value={monthlyPayment}
                  onChange={(e) => setMonthlyPayment(e.target.value.replace(/[^0-9.]/g, ""))}
                  className="w-full bg-transparent font-display text-2xl font-bold tabular outline-none placeholder:text-muted-foreground/40"
                />
                <span className="font-display text-lg text-muted-foreground">₪</span>
              </div>
              {errors.monthlyPayment && (
                <p className="mt-1 text-xs text-destructive">{errors.monthlyPayment}</p>
              )}
            </>
          </Field>

          <Field label="מספר תשלומים שנותרו">
            <>
              <input
                inputMode="numeric"
                placeholder="0"
                value={remainingPayments}
                onChange={(e) => setRemainingPayments(e.target.value.replace(/[^0-9]/g, ""))}
                className="w-full bg-transparent font-display text-2xl font-bold tabular outline-none placeholder:text-muted-foreground/40"
              />
              {errors.remainingPayments && (
                <p className="mt-1 text-xs text-destructive">{errors.remainingPayments}</p>
              )}
            </>
          </Field>

          <Field label="תאריך חיוב הבא">
            <input
              type="date"
              value={nextPaymentDate}
              onChange={(e) => setNextPaymentDate(e.target.value)}
              className="w-full bg-transparent text-base font-medium outline-none [color-scheme:dark]"
            />
          </Field>

          <Field label="הערות">
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="הערה אופציונלית"
              className="w-full bg-transparent text-base font-medium outline-none placeholder:text-muted-foreground/60"
            />
          </Field>

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
              className="flex-1 rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition active:scale-[0.98]"
            >
              שמור
            </button>
          </div>
        </form>
      )}

      {/* Empty state */}
      {loans.length === 0 && formMode === "closed" && (
        <div className="rounded-2xl border border-border bg-surface p-8 text-center">
          <CreditCard className="mx-auto h-8 w-8 text-muted-foreground/40" />
          <p className="mt-3 text-sm font-semibold">אין הלוואות פעילות</p>
          <p className="mt-1 text-xs text-muted-foreground/60">
            הוסף הלוואה כדי לכלול אותה בתחזית התזרים.
          </p>
          <button
            onClick={openAdd}
            className="mt-4 rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition active:scale-[0.98]"
          >
            הוסף הלוואה
          </button>
        </div>
      )}

      {/* Loans list */}
      {loans.length > 0 && (
        <ul className="space-y-3">
          {loans.map((loan) => (
            <li key={loan.id} className="rounded-2xl border border-border bg-surface p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary">
                    <CreditCard className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{loan.name}</p>
                    {loan.lender && (
                      <p className="text-xs text-muted-foreground">{loan.lender}</p>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    onClick={() => openEdit(loan)}
                    className="flex items-center gap-1 rounded-full border border-border bg-surface-elevated px-2 py-0.5 text-[10px] font-medium text-muted-foreground transition hover:border-primary hover:text-primary"
                  >
                    <Pencil className="h-2.5 w-2.5" />
                    ערוך
                  </button>
                  <button
                    onClick={() => handleDelete(loan.id)}
                    className="flex items-center gap-1 rounded-full border border-border bg-surface-elevated px-2 py-0.5 text-[10px] font-medium text-muted-foreground transition hover:border-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-2.5 w-2.5" />
                    מחק
                  </button>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 border-t border-border/40 pt-3">
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    יתרה
                  </p>
                  <p className="mt-0.5 font-display text-sm font-bold tabular">
                    {fmt(loan.remainingBalance)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    חודשי
                  </p>
                  <p className="mt-0.5 font-display text-sm font-bold tabular text-destructive">
                    {fmt(loan.monthlyPayment)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    נותרו
                  </p>
                  <p className="mt-0.5 font-display text-sm font-bold tabular">
                    {loan.remainingPayments}
                  </p>
                </div>
              </div>
              {loan.nextPaymentDate && (
                <p className="mt-2 text-[11px] text-muted-foreground">
                  חיוב הבא: {fmtDate(loan.nextPaymentDate)}
                </p>
              )}
              {loan.notes && (
                <p className="mt-1 text-[11px] text-muted-foreground/70">{loan.notes}</p>
              )}
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
