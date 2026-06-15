import { createFileRoute } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { Building2, CheckCircle2, Pencil, Trash2, Plus, Clock } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import {
  useFinance,
  fmt,
  fmtDate,
  financeStore,
  daysUntil,
  labelDaysUntil,
  AUTHORITY_LABELS,
  type AuthorityObligation,
  type AuthorityType,
} from "@/lib/finance-store";

export const Route = createFileRoute("/authorities")({
  head: () => ({ meta: [{ title: "התחייבויות לרשויות — Cashflow OS" }] }),
  component: AuthoritiesScreen,
});

const AUTHORITY_TYPES: AuthorityType[] = [
  "vat",
  "income_tax",
  "national_insurance",
  "municipality",
  "other",
];

function defaultDueDate() {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().slice(0, 10);
}

type FormMode = "closed" | "add" | string;

function AuthoritiesScreen() {
  const { authorityObligations } = useFinance();

  const [formMode, setFormMode] = useState<FormMode>("closed");
  const [authority, setAuthority] = useState<AuthorityType>("vat");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState(defaultDueDate);
  const [notes, setNotes] = useState("");

  const openAdd = () => {
    setAuthority("vat");
    setAmount("");
    setDueDate(defaultDueDate());
    setNotes("");
    setFormMode("add");
  };

  const openEdit = (o: AuthorityObligation) => {
    setAuthority(o.authority);
    setAmount(String(o.amount));
    setDueDate(o.dueDate);
    setNotes(o.notes ?? "");
    setFormMode(o.id);
  };

  const closeForm = () => setFormMode("closed");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = Number(amount);
    if (!numAmount) return;
    const payload = { authority, amount: numAmount, dueDate, notes: notes || undefined };
    if (formMode === "add") {
      financeStore.addAuthorityObligation(payload);
    } else {
      financeStore.updateAuthorityObligation(formMode, payload);
    }
    closeForm();
  };

  const handleDelete = (id: string) => {
    if (window.confirm("למחוק את ההתחייבות?")) {
      financeStore.deleteAuthorityObligation(id);
    }
  };

  const pending = authorityObligations.filter((o) => o.status === "pending");
  const paid = authorityObligations.filter((o) => o.status === "paid");
  const totalPending = pending.reduce((s, o) => s + o.amount, 0);
  const overdueCount = pending.filter((o) => daysUntil(o.dueDate) < 0).length;
  const hasOverdue = overdueCount > 0;

  return (
    <AppShell title="התחייבויות לרשויות" subtitle="מע״מ · מס הכנסה · ביטוח לאומי">
      {/* Summary banner */}
      {pending.length > 0 && formMode === "closed" && (
        <div className={`mb-5 flex items-center justify-between rounded-2xl border px-4 py-3 ${hasOverdue ? "border-destructive/40 bg-destructive/10" : "border-warning/40 bg-warning/10"}`}>
          <div className={`flex items-center gap-2 ${hasOverdue ? "text-destructive" : "text-warning"}`}>
            <Clock className="h-4 w-4" />
            <span className="text-sm font-semibold">
              {hasOverdue ? `${overdueCount} התחייבויות באיחור` : `${pending.length} התחייבויות פעילות`}
            </span>
          </div>
          <span className={`font-display text-sm font-bold tabular ${hasOverdue ? "text-destructive" : "text-warning"}`}>
            {fmt(totalPending)}
          </span>
        </div>
      )}

      {/* Add button */}
      {formMode === "closed" && (
        <button
          onClick={openAdd}
          className="mb-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-primary/40 bg-primary/5 py-3 text-sm font-semibold text-primary transition active:scale-[0.98]"
        >
          <Plus className="h-4 w-4" />
          הוסף התחייבות
        </button>
      )}

      {/* Inline form */}
      {formMode !== "closed" && (
        <form
          onSubmit={submit}
          className="mb-5 space-y-4 rounded-3xl border border-border bg-surface p-5"
        >
          <h3 className="font-display text-base font-semibold">
            {formMode === "add" ? "התחייבות חדשה" : "עריכת התחייבות"}
          </h3>

          {/* Authority selector */}
          <Field label="רשות">
            <div className="flex flex-wrap gap-2">
              {AUTHORITY_TYPES.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => setAuthority(a)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                    authority === a
                      ? "border-primary bg-primary/15 text-primary"
                      : "border-border bg-surface-elevated text-muted-foreground"
                  }`}
                >
                  {AUTHORITY_LABELS[a]}
                </button>
              ))}
            </div>
          </Field>

          {/* Amount */}
          <Field label="סכום לתשלום">
            <div className="flex items-baseline gap-1">
              <input
                inputMode="decimal"
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
                className="w-full bg-transparent font-display text-2xl font-bold tabular outline-none placeholder:text-muted-foreground/40"
                autoFocus
              />
              <span className="font-display text-lg text-muted-foreground">₪</span>
            </div>
          </Field>

          {/* Due date */}
          <Field label="תאריך תשלום">
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full bg-transparent text-base font-medium outline-none [color-scheme:dark]"
            />
          </Field>

          {/* Notes */}
          <Field label='הערות (אופציונלי)'>
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="לדוגמה: דו״ח חודשי מע״מ"
              className="w-full bg-transparent text-base font-medium outline-none placeholder:text-muted-foreground/60"
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
              disabled={!amount}
              className="flex-1 rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition active:scale-[0.98] disabled:opacity-40"
            >
              שמור
            </button>
          </div>
        </form>
      )}

      {/* Empty state */}
      {authorityObligations.length === 0 && formMode === "closed" && (
        <div className="rounded-2xl border border-border bg-surface p-8 text-center">
          <Building2 className="mx-auto h-8 w-8 text-muted-foreground/40" />
          <p className="mt-3 text-sm font-medium text-muted-foreground">אין התחייבויות פעילות</p>
          <p className="mt-1 text-xs text-muted-foreground/60">
            הוסף תשלומים למע״מ, מס הכנסה, ביטוח לאומי ועירייה.
          </p>
        </div>
      )}

      {/* Pending list */}
      {pending.length > 0 && (
        <section className="mb-5">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            ממתינות לתשלום
          </h2>
          <ul className="space-y-2">
            {pending
              .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
              .map((o) => {
                const days = daysUntil(o.dueDate);
                const isOverdue = days < 0;
                const isUrgent = !isOverdue && days <= 7;
                const dueDateLabel =
                  days === 0
                    ? "לתשלום היום"
                    : days < 0
                      ? `באיחור ${Math.abs(days)} ימים`
                      : `לתשלום בעוד ${days} ימים`;
                return (
                  <li
                    key={o.id}
                    className={`flex items-center gap-3 rounded-2xl border bg-surface p-3 ${
                      isOverdue ? "border-destructive/40" : isUrgent ? "border-warning/40" : "border-border"
                    }`}
                  >
                    <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${isOverdue ? "bg-destructive/15 text-destructive" : isUrgent ? "bg-warning/15 text-warning" : "bg-muted text-muted-foreground"}`}>
                      <Building2 className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{AUTHORITY_LABELS[o.authority]}</p>
                      <p className={`text-xs ${isOverdue ? "text-destructive" : isUrgent ? "text-warning" : "text-muted-foreground"}`}>
                        {fmtDate(o.dueDate)} · {dueDateLabel}
                      </p>
                      {o.notes && (
                        <p className="mt-0.5 truncate text-[10px] text-muted-foreground/60">{o.notes}</p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <p className="font-display text-sm font-semibold tabular text-destructive">
                        {fmt(o.amount)}
                      </p>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => financeStore.markAuthorityObligationPaid(o.id)}
                          className="flex items-center gap-1 rounded-full border border-success/40 bg-success/10 px-2 py-0.5 text-[10px] font-medium text-success transition hover:bg-success/20"
                        >
                          <CheckCircle2 className="h-2.5 w-2.5" />
                          שולם
                        </button>
                        <button
                          onClick={() => openEdit(o)}
                          className="flex items-center gap-1 rounded-full border border-border bg-surface-elevated px-2 py-0.5 text-[10px] font-medium text-muted-foreground transition hover:border-primary hover:text-primary"
                        >
                          <Pencil className="h-2.5 w-2.5" />
                          ערוך
                        </button>
                        <button
                          onClick={() => handleDelete(o.id)}
                          className="flex items-center gap-1 rounded-full border border-border bg-surface-elevated px-2 py-0.5 text-[10px] font-medium text-muted-foreground transition hover:border-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-2.5 w-2.5" />
                          מחק
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
          </ul>
        </section>
      )}

      {/* Paid list */}
      {paid.length > 0 && (
        <section>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            שולמו
          </h2>
          <ul className="space-y-2">
            {paid
              .sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime())
              .map((o) => (
                <li
                  key={o.id}
                  className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-3 opacity-60"
                >
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-success/15 text-success">
                    <CheckCircle2 className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{AUTHORITY_LABELS[o.authority]}</p>
                    <p className="text-xs text-muted-foreground">{fmtDate(o.dueDate)}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <p className="font-display text-sm font-semibold tabular line-through text-muted-foreground">
                      {fmt(o.amount)}
                    </p>
                    <button
                      onClick={() => handleDelete(o.id)}
                      className="flex items-center gap-1 rounded-full border border-border bg-surface-elevated px-2 py-0.5 text-[10px] font-medium text-muted-foreground transition hover:border-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-2.5 w-2.5" />
                      מחק
                    </button>
                  </div>
                </li>
              ))}
          </ul>
        </section>
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
