import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, type ReactNode } from "react";
import {
  ChevronRight,
  Pencil,
  Trash2,
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import {
  useFinance,
  fmt,
  fmtDate,
  financeStore,
  type Transaction,
} from "@/lib/finance-store";

export const Route = createFileRoute("/transaction/$id")({
  head: () => ({ meta: [{ title: "פרטי עסקה — Cashflow OS" }] }),
  component: TransactionDetail,
});

const EXPENSE_CATEGORIES = [
  "תוכנה", "ייעוץ", "שכירות", "תקשורת", "ביטוח", "שיווק", "ציוד", "אחר",
];
const VAT_RATE = 0.17;

function TransactionDetail() {
  const { id } = Route.useParams();
  const { transactions } = useFinance();
  const navigate = useNavigate();

  const tx = transactions.find((t) => t.id === id);

  // Edit mode
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [party, setParty] = useState("");
  const [amount, setAmount] = useState("");
  const [vatExempt, setVatExempt] = useState(false);
  const [date, setDate] = useState("");
  const [category, setCategory] = useState("");

  // Delete flow
  const [deleteStep, setDeleteStep] = useState<0 | 1 | 2>(0);
  const [deletedTx, setDeletedTx] = useState<Transaction | null>(null);
  const [undoCountdown, setUndoCountdown] = useState(10);

  // Undo timer: auto-navigate after 10s
  useEffect(() => {
    if (!deletedTx) return;
    const timer = setInterval(() => {
      setUndoCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          navigate({ to: "/transactions" });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [deletedTx, navigate]);

  // Not found and not deleted
  if (!tx && !deletedTx) {
    return (
      <AppShell title="פרטי עסקה">
        <div className="rounded-2xl border border-border bg-surface p-8 text-center">
          <p className="text-sm text-muted-foreground">העסקה לא נמצאה.</p>
          <Link to="/transactions" className="mt-3 block text-xs font-medium text-primary">
            חזרה לפעילות
          </Link>
        </div>
      </AppShell>
    );
  }

  const startEdit = () => {
    if (!tx) return;
    setParty(tx.party);
    setAmount(String(tx.amountBeforeVat));
    setVatExempt(tx.vatExempt);
    setDate(tx.date);
    setCategory(tx.category ?? "");
    setMode("edit");
  };

  const saveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tx || !party || !amount) return;
    financeStore.updateTransaction(id, {
      party,
      amountBeforeVat: Number(amount),
      vatExempt,
      date,
      category: category || undefined,
    });
    setMode("view");
  };

  const confirmDelete = () => {
    if (!tx) return;
    const snapshot = { ...tx };
    financeStore.deleteTransaction(tx.id);
    setDeletedTx(snapshot);
    setDeleteStep(0);
    setUndoCountdown(10);
  };

  const handleUndo = () => {
    if (!deletedTx) return;
    financeStore.restoreTransaction(deletedTx);
    setDeletedTx(null);
    setUndoCountdown(10);
  };

  // Deleted state — undo window
  if (deletedTx) {
    return (
      <AppShell
        header={
          <div className="flex items-center gap-3">
            <Link
              to="/transactions"
              className="grid h-10 w-10 place-items-center rounded-full border border-border bg-surface"
            >
              <ChevronRight className="h-5 w-5" />
            </Link>
          </div>
        }
      >
        <div className="flex flex-col items-center gap-6 py-16 text-center">
          <div className="grid h-16 w-16 place-items-center rounded-full bg-muted">
            <Trash2 className="h-7 w-7 text-muted-foreground" />
          </div>
          <div>
            <p className="text-lg font-semibold">הפעולה נמחקה</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {deletedTx.party} · {fmt(deletedTx.amount)}
            </p>
          </div>
          <button
            onClick={handleUndo}
            className="rounded-2xl bg-primary px-8 py-3 font-semibold text-primary-foreground transition active:scale-[0.98]"
          >
            בטל מחיקה ({undoCountdown})
          </button>
          <Link to="/transactions" className="text-sm font-medium text-muted-foreground">
            חזרה לרשימה
          </Link>
        </div>
      </AppShell>
    );
  }

  const editAmountBeforeVat = Number(amount) || 0;
  const editVatAmount = vatExempt ? 0 : Math.round(editAmountBeforeVat * VAT_RATE);
  const editTotal = editAmountBeforeVat + editVatAmount;

  return (
    <>
      <AppShell
        header={
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link
                to="/transactions"
                className="grid h-10 w-10 place-items-center rounded-full border border-border bg-surface"
              >
                <ChevronRight className="h-5 w-5" />
              </Link>
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  {tx!.type === "income" ? "הכנסה" : "הוצאה"}
                </p>
                <h1 className="font-display text-xl font-semibold">{tx!.party}</h1>
              </div>
            </div>
            {mode === "view" && (
              <button
                onClick={startEdit}
                className="flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-semibold transition hover:border-primary hover:text-primary active:scale-[0.98]"
              >
                <Pencil className="h-3.5 w-3.5" />
                ערוך
              </button>
            )}
          </div>
        }
      >
        {mode === "view" ? (
          <ViewMode tx={tx!} onDelete={() => setDeleteStep(1)} />
        ) : (
          <form onSubmit={saveEdit} className="space-y-3">
            {/* Amount hero */}
            <div className="rounded-3xl border border-border bg-surface p-6 text-center">
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
              {editAmountBeforeVat > 0 && (
                <div className="mt-4 space-y-1 border-t border-border/40 pt-3 text-sm">
                  {!vatExempt && (
                    <div className="flex justify-between text-muted-foreground">
                      <span>מע״מ (17%)</span>
                      <span className="tabular">{fmt(editVatAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-semibold">
                    <span>סה״כ</span>
                    <span className="tabular">{fmt(editTotal)}</span>
                  </div>
                </div>
              )}
            </div>

            <label className="flex cursor-pointer items-center justify-between rounded-2xl border border-border bg-surface px-4 py-3">
              <span className="text-sm font-medium">פטור ממע״מ</span>
              <button
                type="button"
                role="switch"
                aria-checked={vatExempt}
                onClick={() => setVatExempt((v) => !v)}
                className={`relative h-6 w-11 rounded-full transition-colors ${vatExempt ? "bg-primary" : "bg-muted"}`}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${vatExempt ? "translate-x-5" : "translate-x-0.5"}`}
                />
              </button>
            </label>

            <EditField label={tx!.type === "income" ? "לקוח" : "ספק"}>
              <input
                value={party}
                onChange={(e) => setParty(e.target.value)}
                className="w-full bg-transparent text-base font-medium outline-none placeholder:text-muted-foreground/60"
              />
            </EditField>

            {tx!.type === "expense" && (
              <EditField label="קטגוריה">
                <div className="-mx-1 flex flex-wrap gap-2">
                  {EXPENSE_CATEGORIES.map((c) => (
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
              </EditField>
            )}

            <EditField label="תאריך">
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-transparent text-base font-medium outline-none [color-scheme:dark]"
              />
            </EditField>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setMode("view")}
                className="flex-1 rounded-xl border border-border py-3 text-sm font-semibold text-muted-foreground transition active:scale-[0.98]"
              >
                ביטול
              </button>
              <button
                type="submit"
                disabled={!party || !amount}
                className="flex-1 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground transition active:scale-[0.98] disabled:opacity-40"
              >
                שמור שינויים
              </button>
            </div>
          </form>
        )}
      </AppShell>

      {/* Step 1: first confirmation */}
      {deleteStep === 1 && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 px-4 pb-6">
          <div className="w-full max-w-[480px] rounded-3xl border border-border bg-surface p-6">
            <p className="text-center text-base font-semibold">האם למחוק פעולה זו?</p>
            <p className="mt-1 text-center text-sm text-muted-foreground">
              {tx!.party} · {fmt(tx!.amount)}
            </p>
            <div className="mt-5 flex gap-3">
              <button
                onClick={() => setDeleteStep(0)}
                className="flex-1 rounded-xl border border-border py-3 text-sm font-semibold text-muted-foreground transition active:scale-[0.98]"
              >
                ביטול
              </button>
              <button
                onClick={() => setDeleteStep(2)}
                className="flex-1 rounded-xl border border-destructive/40 bg-destructive/10 py-3 text-sm font-semibold text-destructive transition active:scale-[0.98]"
              >
                כן, מחק
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: final confirmation */}
      {deleteStep === 2 && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 px-4 pb-6">
          <div className="w-full max-w-[480px] rounded-3xl border border-destructive/40 bg-surface p-6">
            <div className="flex justify-center">
              <span className="grid h-12 w-12 place-items-center rounded-full bg-destructive/10">
                <Trash2 className="h-6 w-6 text-destructive" />
              </span>
            </div>
            <p className="mt-4 text-center text-base font-semibold">אישור סופי למחיקה</p>
            <p className="mt-1 text-center text-xs text-muted-foreground">
              ניתן לשחזר תוך 10 שניות לאחר המחיקה
            </p>
            <div className="mt-5 flex gap-3">
              <button
                onClick={() => setDeleteStep(0)}
                className="flex-1 rounded-xl border border-border py-3 text-sm font-semibold text-muted-foreground transition active:scale-[0.98]"
              >
                ביטול
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 rounded-xl bg-destructive py-3 text-sm font-semibold text-white transition active:scale-[0.98]"
              >
                מחק סופית
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function ViewMode({ tx, onDelete }: { tx: Transaction; onDelete: () => void }) {
  const isIncome = tx.type === "income";
  const statusLabels: Record<string, string> = {
    paid: isIncome ? "התקבל" : "שולם",
    pending: "ממתין",
    overdue: "באיחור",
  };
  const statusColors: Record<string, string> = {
    paid: "bg-success/15 text-success",
    pending: "bg-muted text-muted-foreground",
    overdue: "bg-warning/15 text-warning",
  };

  return (
    <div className="space-y-3">
      {/* Amount hero */}
      <div className="rounded-3xl border border-border bg-surface p-6 text-center">
        <span
          className={`mx-auto grid h-14 w-14 place-items-center rounded-2xl ${
            isIncome ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"
          }`}
        >
          {isIncome ? (
            <ArrowDownLeft className="h-7 w-7" />
          ) : (
            <ArrowUpRight className="h-7 w-7" />
          )}
        </span>
        <p
          className={`mt-4 font-display text-4xl font-bold tabular ${
            isIncome ? "text-success" : "text-foreground"
          }`}
        >
          {isIncome ? "+" : "−"}
          {fmt(tx.amount)}
        </p>
        <span
          className={`mt-2 inline-block rounded-full px-3 py-1 text-xs font-semibold ${statusColors[tx.status]}`}
        >
          {statusLabels[tx.status]}
        </span>
      </div>

      {/* Detail rows */}
      <div className="divide-y divide-border rounded-3xl border border-border bg-surface">
        <DetailRow label={isIncome ? "לקוח" : "ספק"} value={tx.party} />
        <DetailRow label="תאריך" value={fmtDate(tx.date)} />
        <DetailRow label="סכום לפני מע״מ" value={fmt(tx.amountBeforeVat)} />
        {tx.vatExempt ? (
          <DetailRow label="מע״מ" value="פטור" />
        ) : (
          <DetailRow label='מע"מ (17%)' value={fmt(tx.vatAmount)} />
        )}
        <DetailRow label="סה״כ כולל מע״מ" value={fmt(tx.amount)} />
        {tx.category && <DetailRow label="קטגוריה" value={tx.category} />}
        {tx.updatedAt && (
          <DetailRow label="נערך לאחרונה" value={fmtDate(tx.updatedAt.slice(0, 10))} />
        )}
      </div>

      {/* Actions */}
      {tx.status !== "paid" && (
        <button
          onClick={() => financeStore.markAsPaid(tx.id)}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-success/40 bg-success/10 py-3 text-sm font-semibold text-success transition active:scale-[0.98] hover:bg-success/20"
        >
          <CheckCircle2 className="h-4 w-4" />
          {isIncome ? "סמן כהתקבל" : "סמן כשולם"}
        </button>
      )}

      <button
        onClick={onDelete}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-destructive/30 bg-destructive/5 py-3 text-sm font-semibold text-destructive transition active:scale-[0.98] hover:bg-destructive/10"
      >
        <Trash2 className="h-4 w-4" />
        מחק עסקה
      </button>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-5 py-3.5">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold">{value}</p>
    </div>
  );
}

function EditField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block rounded-2xl border border-border bg-surface px-4 py-3">
      <span className="block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}
