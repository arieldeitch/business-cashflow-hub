import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowDownLeft, ArrowUpRight, AlertTriangle, AlertCircle, CheckCircle2, Eye, EyeOff, Bell, Building2, Banknote, Pencil } from "lucide-react";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import {
  useFinance,
  fmt,
  fmtDate,
  getVatSummary,
  getUpcomingAuthorityObligations,
  getCollectionsSummary,
  get30DayProjection,
  labelDaysUntil,
  daysUntil,
  financeStore,
  AUTHORITY_LABELS,
} from "@/lib/finance-store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Business Cashflow OS" },
      { name: "description", content: "מצב תזרים, הכנסות צפויות, הוצאות ותחזית 30 יום." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { balance, startingBalance, transactions, recurringExpenses, authorityObligations } = useFinance();
  const [hidden, setHidden] = useState(false);
  const [editingBalance, setEditingBalance] = useState(false);
  const [balanceDraft, setBalanceDraft] = useState("");
  const navigate = useNavigate();

  // Overdue alert banner counts (independent of projection window)
  const { overdueCount, overdueAmount } = useMemo(() => {
    let oCount = 0, oAmt = 0;
    for (const t of transactions) {
      if (t.status === "overdue") { oCount++; oAmt += t.amount; }
    }
    return { overdueCount: oCount, overdueAmount: oAmt };
  }, [transactions]);

  // 30-day projection — shared logic with Forecast screen
  const { expectedIncome, expectedExpenses, projected } = useMemo(
    () => get30DayProjection({ transactions, recurringExpenses, authorityObligations }, balance),
    [balance, transactions, recurringExpenses, authorityObligations]
  );

  const net = expectedIncome - expectedExpenses;

  const vatSummary = useMemo(() => getVatSummary(transactions), [transactions]);
  const collectionsSummary = useMemo(() => getCollectionsSummary(transactions), [transactions]);
  const upcomingObligations = useMemo(
    () => getUpcomingAuthorityObligations(authorityObligations, 3),
    [authorityObligations]
  );

  const healthInsights = useMemo(() => {
    type Tone = "success" | "warning" | "destructive";
    const items: { key: string; tone: Tone; text: string }[] = [];

    // 1. Forecast health — always shown
    if (projected > 0) {
      items.push({ key: "forecast", tone: "success", text: "התזרים החזוי חיובי ב-30 הימים הקרובים" });
    } else {
      items.push({ key: "forecast", tone: "destructive", text: "צפוי מחסור בתזרים" });
    }

    // 2. Overdue receivables
    if (collectionsSummary.totalOverdueReceivables > 0) {
      items.push({ key: "collections", tone: "warning", text: `${fmt(collectionsSummary.totalOverdueReceivables)} בגבייה באיחור` });
    }

    // 3. Nearest pending authority obligation
    if (upcomingObligations.length > 0) {
      const nearest = upcomingObligations[0];
      const days = daysUntil(nearest.dueDate);
      items.push({ key: "authority", tone: "warning", text: `תשלום ${AUTHORITY_LABELS[nearest.authority]} ${labelDaysUntil(days)}` });
    }

    // 4. Cash in risk
    if (collectionsSummary.cashInRisk > 5000) {
      items.push({ key: "cash-risk", tone: "warning", text: "נדרש מעקב אחר גבייה השבוע" });
    }

    // 5. All-clear: no warnings and forecast positive
    const hasWarnings = items.some((i) => i.tone === "warning");
    if (!hasWarnings && projected > 0) {
      items.push({ key: "all-clear", tone: "success", text: "אין סיכון תזרימי מיידי" });
    }

    return items;
  }, [projected, collectionsSummary, upcomingObligations]);

  const upcomingTxs = useMemo(
    () =>
      transactions
        .filter((t) => t.status !== "paid")
        .sort((a, b) => +new Date(a.date) - +new Date(b.date))
        .slice(0, 4),
    [transactions]
  );

  const createVatObligation = () => {
    const existingVat = financeStore.get().authorityObligations.find(
      (o) => o.authority === "vat" && o.status === "pending"
    );
    if (existingVat) {
      navigate({ to: "/authorities" });
      return;
    }
    const d = new Date();
    d.setDate(d.getDate() + 14);
    const dueDate = d.toISOString().slice(0, 10);
    financeStore.addAuthorityObligation({
      authority: "vat",
      amount: vatSummary.vatBalance,
      dueDate,
      notes: 'מע"מ לתשלום',
    });
    navigate({ to: "/authorities" });
  };

  return (
    <AppShell
      header={
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              תזרים מזומנים
            </p>
            <h1 className="mt-1 font-display text-2xl font-semibold">Cashflow OS</h1>
          </div>
          <button className="grid h-10 w-10 place-items-center rounded-full border border-border bg-surface text-muted-foreground">
            <Bell className="h-4 w-4" />
          </button>
        </div>
      }
    >
      {/* Financial Health Card */}
      <section className="mb-5 rounded-3xl border border-border bg-surface p-5">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          בריאות פיננסית
        </p>
        <ul className="space-y-2.5">
          {healthInsights.map((ins) => {
            const Icon =
              ins.tone === "success"
                ? CheckCircle2
                : ins.tone === "destructive"
                  ? AlertCircle
                  : AlertTriangle;
            const color =
              ins.tone === "success"
                ? "text-success"
                : ins.tone === "destructive"
                  ? "text-destructive"
                  : "text-warning";
            return (
              <li key={ins.key} className="flex items-center gap-2.5">
                <Icon className={`h-4 w-4 shrink-0 ${color}`} />
                <span className="text-sm font-medium leading-snug">{ins.text}</span>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Balance hero */}
      <section
        className="relative overflow-hidden rounded-3xl p-6 text-primary-foreground"
        style={{ background: "var(--gradient-balance)" }}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-[0.18em] opacity-80">
            יתרה נוכחית
          </span>
          {!editingBalance && (
            <button
              onClick={() => setHidden((v) => !v)}
              className="grid h-8 w-8 place-items-center rounded-full bg-black/15"
              aria-label="הצג/הסתר יתרה"
            >
              {hidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          )}
        </div>

        {editingBalance ? (
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <input
                type="text"
                inputMode="decimal"
                value={balanceDraft}
                onChange={(e) => setBalanceDraft(e.target.value.replace(/[^0-9]/g, ""))}
                className="w-full rounded-xl bg-black/20 px-3 py-2 font-display text-3xl font-bold tabular text-primary-foreground placeholder:text-white/40 outline-none"
                placeholder="0"
                autoFocus
              />
              <span className="font-display text-xl opacity-70">₪</span>
            </div>
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => setEditingBalance(false)}
                className="flex-1 rounded-xl bg-black/20 py-2 text-sm font-semibold transition active:scale-[0.98]"
              >
                ביטול
              </button>
              <button
                onClick={() => {
                  const n = Number(balanceDraft);
                  if (!isNaN(n) && balanceDraft !== "") financeStore.setBalance(n);
                  setEditingBalance(false);
                }}
                className="flex-1 rounded-xl bg-white/20 py-2 text-sm font-semibold transition active:scale-[0.98]"
              >
                שמור
              </button>
            </div>
          </div>
        ) : (
          <>
            <p className="mt-3 font-display text-4xl font-bold tabular">
              {hidden ? "••••••" : fmt(balance)}
            </p>
            <button
              onClick={() => {
                setBalanceDraft(String(startingBalance));
                setEditingBalance(true);
              }}
              className="mt-2 flex items-center gap-1 text-xs opacity-60 transition hover:opacity-90 active:scale-[0.98]"
            >
              <Pencil className="h-3 w-3" />
              עדכון יתרה
            </button>
          </>
        )}

        {!editingBalance && (
          <div className="mt-5 grid grid-cols-2 gap-3 text-xs">
            <div className="rounded-2xl bg-black/15 p-3">
              <p className="opacity-80">תחזית (30 יום)</p>
              <p className="mt-1 font-display text-lg font-semibold tabular">
                {hidden ? "••••" : fmt(projected)}
              </p>
            </div>
            <div className="rounded-2xl bg-black/15 p-3">
              <p className="opacity-80">נטו צפוי</p>
              <p className={`mt-1 font-display text-lg font-semibold tabular ${net >= 0 ? "" : "text-destructive-foreground"}`}>
                {net >= 0 ? "+" : "−"}{hidden ? "••••" : fmt(Math.abs(net))}
              </p>
            </div>
          </div>
        )}
      </section>

      {/* Quick actions — primary (create) */}
      <section className="mt-5 grid grid-cols-2 gap-3">
        <Link
          to="/income"
          className="group flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 transition active:scale-[0.98]"
        >
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-success/15 text-success">
            <ArrowDownLeft className="h-5 w-5" strokeWidth={2.4} />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold">הוסף הכנסה</p>
            <p className="text-xs text-muted-foreground">תשלום צפוי</p>
          </div>
        </Link>
        <Link
          to="/expense"
          className="group flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 transition active:scale-[0.98]"
        >
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-destructive/15 text-destructive">
            <ArrowUpRight className="h-5 w-5" strokeWidth={2.4} />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold">הוסף הוצאה</p>
            <p className="text-xs text-muted-foreground">חשבון או עלות</p>
          </div>
        </Link>
      </section>

      {/* Quick navigation — secondary (core workflows) */}
      <section className="mt-3 grid grid-cols-2 gap-3">
        <Link
          to="/collections"
          className="flex items-center gap-2 rounded-2xl border border-border bg-surface p-3 transition active:scale-[0.98]"
        >
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-success/15 text-success">
            <Banknote className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold">גבייה</p>
            <p className="text-xs text-muted-foreground">מעקב הכנסות</p>
          </div>
        </Link>
        <Link
          to="/authorities"
          className="flex items-center gap-2 rounded-2xl border border-border bg-surface p-3 transition active:scale-[0.98]"
        >
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-warning/15 text-warning">
            <Building2 className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold">רשויות</p>
            <p className="text-xs text-muted-foreground">מס ותשלומים</p>
          </div>
        </Link>
      </section>

      {/* 30 day cards */}
      <section className="mt-5 grid grid-cols-2 gap-3">
        <StatCard
          label="הכנסות צפויות"
          sub={expectedIncome === 0 ? "אין עדיין הכנסות להצגה" : "30 ימים הקרובים"}
          amount={expectedIncome}
          tone="success"
        />
        <StatCard
          label="הוצאות צפויות"
          sub={expectedExpenses === 0 ? "אין עדיין הוצאות להצגה" : "30 ימים הקרובים"}
          amount={expectedExpenses}
          tone="destructive"
        />
      </section>

      {/* Overdue alert */}
      {overdueCount > 0 && (
        <Link
          to="/transactions"
          search={{ filter: "overdue" }}
          className="mt-5 flex items-center gap-3 rounded-2xl border border-warning/40 bg-warning/10 p-4"
        >
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-warning/20 text-warning">
            <AlertTriangle className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">
              {overdueCount} {overdueCount === 1 ? "תשלום באיחור" : "תשלומים באיחור"}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {fmt(overdueAmount)} דורשים טיפול
            </p>
          </div>
          <span className="text-xs font-medium text-warning">לסקירה ←</span>
        </Link>
      )}

      {/* Upcoming transactions */}
      <section className="mt-6">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">קרובים</h2>
          <Link to="/transactions" className="text-xs font-medium text-primary">
            הצג הכל
          </Link>
        </div>
        {upcomingTxs.length === 0 ? (
          <div className="mt-3 rounded-2xl border border-border bg-surface p-5 text-center">
            <p className="text-sm text-muted-foreground">אין עדיין פעולות ממתינות</p>
            <p className="mt-1 text-xs text-muted-foreground/60">הוסף הכנסה או הוצאה כדי לעקוב אחר הפעילות הקרובה</p>
          </div>
        ) : (
          <ul className="mt-3 space-y-2">
            {upcomingTxs.map((t) => (
              <li
                key={t.id}
                className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-3"
              >
                <span
                  className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${
                    t.type === "income" ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"
                  }`}
                >
                  {t.type === "income" ? (
                    <ArrowDownLeft className="h-5 w-5" />
                  ) : (
                    <ArrowUpRight className="h-5 w-5" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{t.party}</p>
                  <p className="text-xs text-muted-foreground">
                    {fmtDate(t.date)}
                    {t.status === "overdue" && <span className="ms-1 text-warning">· באיחור</span>}
                  </p>
                </div>
                <p className={`font-display text-sm font-semibold tabular ${t.type === "income" ? "text-success" : "text-foreground"}`}>
                  {t.type === "income" ? "+" : "−"}{fmt(t.amount)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Collections card */}
      <section className="mt-6">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">גבייה פתוחה</h2>
          <Link to="/collections" className="text-xs font-medium text-primary">
            לגבייה
          </Link>
        </div>
        <Link
          to="/collections"
          className="mt-3 block rounded-3xl border border-border bg-surface p-5 transition active:scale-[0.98]"
        >
          {collectionsSummary.openReceivablesCount === 0 ? (
            <div className="flex flex-col items-center gap-2 py-2 text-center">
              <Banknote className="h-6 w-6 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">אין כרגע גביות פתוחות</p>
              <p className="text-xs text-muted-foreground/60">הוסף גביה מלקוח כדי לעקוב אחר תשלומים</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-x-6 gap-y-4">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  סה״כ פתוח
                </p>
                <p className="mt-1 font-display text-lg font-bold tabular">
                  {fmt(collectionsSummary.totalOpenReceivables)}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  באיחור
                </p>
                <p className={`mt-1 font-display text-lg font-bold tabular ${collectionsSummary.totalOverdueReceivables > 0 ? "text-destructive" : "text-muted-foreground"}`}>
                  {fmt(collectionsSummary.totalOverdueReceivables)}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  לקוחות באיחור
                </p>
                <p className={`mt-1 font-display text-lg font-bold tabular ${collectionsSummary.overdueCustomersCount > 0 ? "text-warning" : "text-muted-foreground"}`}>
                  {collectionsSummary.overdueCustomersCount}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  כסף בסיכון
                </p>
                <p className={`mt-1 font-display text-lg font-bold tabular ${collectionsSummary.cashInRisk > 0 ? "text-warning" : "text-muted-foreground"}`}>
                  {fmt(collectionsSummary.cashInRisk)}
                </p>
              </div>
            </div>
          )}
        </Link>
      </section>

      {/* Authority Obligations card */}
      <section className="mt-6">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">התחייבויות לרשויות</h2>
          <Link to="/authorities" className="text-xs font-medium text-primary">
            הצג הכל
          </Link>
        </div>
        <Link
          to="/authorities"
          className="mt-3 block rounded-3xl border border-border bg-surface p-5 transition active:scale-[0.98]"
        >
          {upcomingObligations.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-2 text-center">
              <Building2 className="h-6 w-6 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">אין כרגע התחייבויות לרשויות</p>
              <p className="text-xs text-muted-foreground/60">הוסף תשלום למע״מ, מס הכנסה או ביטוח לאומי</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {upcomingObligations.map((o) => {
                const days = daysUntil(o.dueDate);
                return (
                  <li key={o.id} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold">{AUTHORITY_LABELS[o.authority]}</p>
                      <p className={`text-xs ${days < 0 ? "text-destructive" : "text-muted-foreground"}`}>
                        {labelDaysUntil(days)}
                      </p>
                    </div>
                    <p className="font-display text-sm font-bold tabular text-destructive">
                      {fmt(o.amount)}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </Link>
      </section>

      {/* VAT Insights */}
      <section className="mt-6">
        <h2 className="font-display text-lg font-semibold">תובנות מע״מ</h2>
        <div className="mt-3 rounded-3xl border border-border bg-surface p-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                מע״מ עסקאות
              </p>
              <p className="mt-1 font-display text-lg font-semibold tabular text-success">
                {fmt(vatSummary.outputVat)}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                מע״מ תשומות
              </p>
              <p className="mt-1 font-display text-lg font-semibold tabular">
                {fmt(vatSummary.inputVat)}
              </p>
            </div>
          </div>

          <div className="mt-4 border-t border-border pt-4">
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              יתרת מע״מ משוערת
            </p>
            <p
              className={`mt-1 font-display text-xl font-bold tabular ${
                vatSummary.vatBalance >= 0 ? "text-warning" : "text-success"
              }`}
            >
              {vatSummary.vatBalance >= 0
                ? `${fmt(vatSummary.vatBalance)} לתשלום`
                : `${fmt(Math.abs(vatSummary.vatBalance))} זכות`}
            </p>
          </div>

          {vatSummary.vatBalance > 0 && (
            <button
              onClick={createVatObligation}
              className="mt-4 w-full rounded-xl border border-warning/40 bg-warning/10 py-2.5 text-sm font-semibold text-warning transition active:scale-[0.98] hover:bg-warning/20"
            >
              צור התחייבות מע״מ
            </button>
          )}

          <p className="mt-4 text-[10px] leading-relaxed text-muted-foreground">
            המידע הינו הערכה בלבד ואינו מהווה ייעוץ מס.
          </p>
        </div>
      </section>

      {/* Reset demo data */}
      <div className="mt-8 flex justify-center pb-2">
        <button
          onClick={() => {
            if (window.confirm("לאפס את כל הנתונים ולחזור לנתוני הדמו?")) {
              financeStore.resetToDemo();
            }
          }}
          className="text-[11px] font-medium text-muted-foreground/50 underline-offset-2 transition hover:text-muted-foreground hover:underline"
        >
          איפוס נתוני דמו
        </button>
      </div>
    </AppShell>
  );
}

function StatCard({
  label,
  sub,
  amount,
  tone,
}: {
  label: string;
  sub: string;
  amount: number;
  tone: "success" | "destructive";
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-2 font-display text-xl font-semibold tabular">{fmt(amount)}</p>
      <p className={`mt-1 text-[11px] font-medium ${tone === "success" ? "text-success" : "text-destructive"}`}>
        {sub}
      </p>
    </div>
  );
}
