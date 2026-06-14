import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowDownLeft, ArrowUpRight, AlertTriangle, Eye, EyeOff, Bell } from "lucide-react";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useFinance, fmt, fmtDate, withinDays, getVatSummary } from "@/lib/finance-store";

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
  const { balance, transactions } = useFinance();
  const [hidden, setHidden] = useState(false);

  const { expectedIncome, expectedExpenses, overdueCount, overdueAmount } = useMemo(() => {
    let inc = 0, exp = 0, oCount = 0, oAmt = 0;
    for (const t of transactions) {
      if (t.status === "overdue") {
        oCount++;
        oAmt += t.amount;
      }
      if (t.status === "pending" && withinDays(t.date, 30)) {
        if (t.type === "income") inc += t.amount;
        else exp += t.amount;
      }
    }
    return { expectedIncome: inc, expectedExpenses: exp, overdueCount: oCount, overdueAmount: oAmt };
  }, [transactions]);

  const vatSummary = useMemo(() => getVatSummary(transactions), [transactions]);

  const net = expectedIncome - expectedExpenses;
  const projected = balance + net;

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
      {/* Balance hero */}
      <section
        className="relative overflow-hidden rounded-3xl p-6 text-primary-foreground"
        style={{ background: "var(--gradient-balance)" }}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-[0.18em] opacity-80">
            יתרה נוכחית
          </span>
          <button
            onClick={() => setHidden((v) => !v)}
            className="grid h-8 w-8 place-items-center rounded-full bg-black/15"
            aria-label="הצג/הסתר יתרה"
          >
            {hidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        <p className="mt-3 font-display text-4xl font-bold tabular">
          {hidden ? "••••••" : fmt(balance)}
        </p>
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
      </section>

      {/* Quick actions */}
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

      {/* 30 day cards */}
      <section className="mt-5 grid grid-cols-2 gap-3">
        <StatCard
          label="הכנסות צפויות"
          sub="30 ימים הקרובים"
          amount={expectedIncome}
          tone="success"
        />
        <StatCard
          label="הוצאות צפויות"
          sub="30 ימים הקרובים"
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

      {/* Upcoming */}
      <section className="mt-6">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">קרובים</h2>
          <Link to="/transactions" className="text-xs font-medium text-primary">
            הצג הכל
          </Link>
        </div>
        <ul className="mt-3 space-y-2">
          {transactions
            .filter((t) => t.status !== "paid")
            .sort((a, b) => +new Date(a.date) - +new Date(b.date))
            .slice(0, 4)
            .map((t) => (
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

          <p className="mt-4 text-[10px] leading-relaxed text-muted-foreground">
            המידע הינו הערכה בלבד ואינו מהווה ייעוץ מס.
          </p>
        </div>
      </section>
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
