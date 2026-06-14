import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo, type ReactNode } from "react";
import { ArrowDownLeft, CheckCircle2, Pencil, Trash2, AlertTriangle } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import {
  useFinance,
  fmt,
  fmtDate,
  financeStore,
  getCollectionsSummary,
  type Transaction,
  type TxStatus,
} from "@/lib/finance-store";

export const Route = createFileRoute("/collections")({
  head: () => ({ meta: [{ title: "גבייה — Cashflow OS" }] }),
  component: CollectionsScreen,
});

type FilterTab = "all" | "pending" | "overdue" | "paid";

const FILTER_TABS: { id: FilterTab; label: string }[] = [
  { id: "all", label: "הכל" },
  { id: "pending", label: "צפוי" },
  { id: "overdue", label: "באיחור" },
  { id: "paid", label: "התקבל" },
];

const STATUS_LABELS: Record<TxStatus, string> = {
  pending: "צפוי",
  overdue: "באיחור",
  paid: "התקבל",
};

const STATUS_STYLES: Record<TxStatus, string> = {
  pending: "bg-primary/15 text-primary",
  overdue: "bg-destructive/15 text-destructive",
  paid: "bg-success/15 text-success",
};

const VAT_RATE = 0.17;
const CASH_IN_RISK_THRESHOLD = 5000;

function CollectionsScreen() {
  const { transactions } = useFinance();
  const [filter, setFilter] = useState<FilterTab>("all");

  // Edit form state
  const [formMode, setFormMode] = useState<"closed" | string>("closed");
  const [party, setParty] = useState("");
  const [amount, setAmount] = useState("");
  const [vatExempt, setVatExempt] = useState(false);
  const [date, setDate] = useState("");

  const summary = useMemo(() => getCollectionsSummary(transactions), [transactions]);

  const filtered = useMemo(() => {
    const income = transactions
      .filter((t) => t.type === "income")
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    if (filter === "all") return income;
    const statusMap: Record<FilterTab, TxStatus | null> = {
      all: null,
      pending: "pending",
      overdue: "overdue",
      paid: "paid",
    };
    const s = statusMap[filter];
    return income.filter((t) => t.status === s);
  }, [transactions, filter]);

  const openEdit = (tx: Transaction) => {
    setParty(tx.party);
    setAmount(String(tx.amountBeforeVat));
    setVatExempt(tx.vatExempt);
    setDate(tx.date);
    setFormMode(tx.id);
  };

  const closeForm = () => setFormMode("closed");

  const submitEdit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = Number(amount);
    if (!numAmount || !party) return;
    financeStore.updateTransaction(formMode, {
      party,
      amountBeforeVat: numAmount,
      vatExempt,
      date,
    });
    closeForm();
  };

  const handleDelete = (id: string) => {
    if (window.confirm("למחוק את ההכנסה?")) {
      financeStore.deleteTransaction(id);
    }
  };

  const amountBeforeVat = Number(amount) || 0;
  const vatAmount = vatExempt ? 0 : Math.round(amountBeforeVat * VAT_RATE);
  const amountIncludingVat = amountBeforeVat + vatAmount;

  const insights: { key: string; text: string }[] = [];
  if (summary.totalOverdueReceivables > 0) {
    insights.push({ key: "overdue-amount", text: `${fmt(summary.totalOverdueReceivables)} נמצאים באיחור` });
  }
  if (summary.overdueCustomersCount > 0) {
    insights.push({ key: "overdue-customers", text: `${summary.overdueCustomersCount} לקוחות באיחור תשלום` });
  }
  if (summary.cashInRisk > CASH_IN_RISK_THRESHOLD) {
    insights.push({ key: "risk", text: "נדרש מעקב אחר גבייה השבוע" });
  }

  return (
    <AppShell title="גבייה" subtitle="מעקב הכנסות">
      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3">
        <KpiCard label='סה"כ פתוח' amount={summary.totalOpenReceivables} tone="neutral" />
        <KpiCard label="באיחור" amount={summary.totalOverdueReceivables} tone="destructive" />
        <KpiCard label="לקוחות באיחור" count={summary.overdueCustomersCount} tone="warning" />
        <KpiCard label="כסף בסיכון" amount={summary.cashInRisk} tone="warning" />
      </div>

      {/* Insights */}
      {insights.length > 0 && (
        <div className="mt-4 space-y-2">
          {insights.map((ins) => (
            <div
              key={ins.key}
              className="flex items-center gap-3 rounded-2xl border border-warning/40 bg-warning/10 px-4 py-3"
            >
              <AlertTriangle className="h-4 w-4 shrink-0 text-warning" />
              <p className="text-sm font-medium">{ins.text}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filter tabs */}
      <div className="mt-5 flex gap-1 rounded-2xl border border-border bg-surface p-1">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            className={`flex-1 rounded-xl py-2 text-xs font-semibold transition ${
              filter === tab.id
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Inline edit form */}
      {formMode !== "closed" && (
        <form
          onSubmit={submitEdit}
          className="mt-4 space-y-4 rounded-3xl border border-border bg-surface p-5"
        >
          <h3 className="font-display text-base font-semibold">עריכת הכנסה</h3>

          <Field label="לקוח">
            <input
              value={party}
              onChange={(e) => setParty(e.target.value)}
              placeholder="שם לקוח"
              className="w-full bg-transparent text-base font-medium outline-none placeholder:text-muted-foreground/60"
              autoFocus
            />
          </Field>

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

          <label className="flex cursor-pointer items-center justify-between">
            <span className="text-sm font-medium">פטור ממע״מ</span>
            <button
              type="button"
              role="switch"
              aria-checked={vatExempt}
              onClick={() => setVatExempt((v) => !v)}
              className={`relative h-6 w-11 rounded-full transition-colors ${vatExempt ? "bg-primary" : "bg-muted"}`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                  vatExempt ? "translate-x-5" : "translate-x-0.5"
                }`}
              />
            </button>
          </label>

          <Field label="תאריך פירעון">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-transparent text-base font-medium outline-none [color-scheme:dark]"
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
              disabled={!amount || !party}
              className="flex-1 rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition active:scale-[0.98] disabled:opacity-40"
            >
              שמור
            </button>
          </div>
        </form>
      )}

      {/* List */}
      <section className="mt-4">
        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-border bg-surface p-8 text-center">
            <ArrowDownLeft className="mx-auto h-8 w-8 text-muted-foreground/30" />
            <p className="mt-3 text-sm font-medium text-muted-foreground">אין הכנסות בקטגוריה זו</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {filtered.map((tx) => (
              <li
                key={tx.id}
                className={`rounded-2xl border bg-surface p-3 ${
                  tx.status === "overdue" ? "border-destructive/30" : "border-border"
                }`}
              >
                <div className="flex items-start gap-3">
                  <span
                    className={`mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-xl ${
                      tx.status === "paid"
                        ? "bg-success/15 text-success"
                        : tx.status === "overdue"
                          ? "bg-destructive/15 text-destructive"
                          : "bg-primary/15 text-primary"
                    }`}
                  >
                    <ArrowDownLeft className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-semibold">{tx.party}</p>
                      <p className="shrink-0 font-display text-sm font-bold tabular text-success">
                        +{fmt(tx.amount)}
                      </p>
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <p className="text-xs text-muted-foreground">{fmtDate(tx.date)}</p>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_STYLES[tx.status]}`}
                      >
                        {STATUS_LABELS[tx.status]}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      {tx.status !== "paid" && (
                        <button
                          onClick={() => financeStore.markAsPaid(tx.id)}
                          className="flex items-center gap-1 rounded-full border border-success/40 bg-success/10 px-2 py-0.5 text-[10px] font-medium text-success transition hover:bg-success/20"
                        >
                          <CheckCircle2 className="h-2.5 w-2.5" />
                          התקבל תשלום
                        </button>
                      )}
                      <button
                        onClick={() => openEdit(tx)}
                        className="flex items-center gap-1 rounded-full border border-border bg-surface-elevated px-2 py-0.5 text-[10px] font-medium text-muted-foreground transition hover:border-primary hover:text-primary"
                      >
                        <Pencil className="h-2.5 w-2.5" />
                        ערוך
                      </button>
                      <button
                        onClick={() => handleDelete(tx.id)}
                        className="flex items-center gap-1 rounded-full border border-border bg-surface-elevated px-2 py-0.5 text-[10px] font-medium text-muted-foreground transition hover:border-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-2.5 w-2.5" />
                        מחק
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </AppShell>
  );
}

function KpiCard({
  label,
  amount,
  count,
  tone,
}: {
  label: string;
  amount?: number;
  count?: number;
  tone: "neutral" | "destructive" | "warning" | "success";
}) {
  const toneClass: Record<typeof tone, string> = {
    neutral: "text-foreground",
    destructive: "text-destructive",
    warning: "text-warning",
    success: "text-success",
  };
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`mt-2 font-display text-xl font-bold tabular ${toneClass[tone]}`}>
        {amount !== undefined ? fmt(amount) : count}
      </p>
    </div>
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
