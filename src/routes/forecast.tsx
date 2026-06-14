import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { AppShell } from "@/components/AppShell";
import { useFinance, fmt, localISO, getRecurringInWindow } from "@/lib/finance-store";
import { TrendingUp, TrendingDown, Repeat, Building2 } from "lucide-react";

export const Route = createFileRoute("/forecast")({
  head: () => ({ meta: [{ title: "תחזית — Cashflow OS" }] }),
  component: Forecast,
});

function fmtShortDate(d: Date): string {
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}`;
}

function Forecast() {
  const { balance, transactions, recurringExpenses, authorityObligations } = useFinance();

  const { days, totalIn, totalOut, finalBalance, minBalance, maxBalance } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const recurringByDate = getRecurringInWindow(recurringExpenses, 30);

    // Build authority obligations map: date → total amount
    const authorityByDate = new Map<string, number>();
    for (const o of authorityObligations) {
      if (o.status === "pending") {
        authorityByDate.set(o.dueDate, (authorityByDate.get(o.dueDate) ?? 0) + o.amount);
      }
    }

    const dayList: {
      date: Date;
      balance: number;
      in: number;
      out: number;
      recurring: number;
      authority: number;
    }[] = [];
    let running = balance;
    let totalIn = 0;
    let totalOut = 0;

    for (let i = 0; i < 30; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      const dateKey = localISO(d);

      let inToday = 0;
      let outToday = 0;
      for (const t of transactions) {
        if (t.date === dateKey && t.status !== "paid") {
          if (t.type === "income") inToday += t.amount;
          else outToday += t.amount;
        }
      }

      const recurringOut = recurringByDate.get(dateKey) ?? 0;
      const authorityOut = authorityByDate.get(dateKey) ?? 0;
      outToday += recurringOut + authorityOut;

      running += inToday - outToday;
      totalIn += inToday;
      totalOut += outToday;
      dayList.push({ date: d, balance: running, in: inToday, out: outToday, recurring: recurringOut, authority: authorityOut });
    }

    const balances = dayList.map((d) => d.balance);
    return {
      days: dayList,
      totalIn,
      totalOut,
      finalBalance: running,
      minBalance: Math.min(...balances, balance),
      maxBalance: Math.max(...balances, balance),
    };
  }, [balance, transactions, recurringExpenses, authorityObligations]);

  const net = totalIn - totalOut;

  // Chart geometry
  const W = 320;
  const H = 160;
  const padX = 8;
  const padY = 12;
  const range = Math.max(maxBalance - minBalance, 1);
  const points = days.map((d, i) => {
    const x = padX + (i / (days.length - 1)) * (W - padX * 2);
    const y = padY + (1 - (d.balance - minBalance) / range) * (H - padY * 2);
    return [x, y] as const;
  });
  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const areaD = `${pathD} L${points[points.length - 1][0]},${H} L${points[0][0]},${H} Z`;

  const daysWithFlow = days.filter((d) => d.in || d.out);

  return (
    <AppShell title="תחזית 30 יום" subtitle="תחזית תזרים">
      <section
        className="rounded-3xl p-5 text-primary-foreground"
        style={{ background: "var(--gradient-balance)" }}
      >
        <p className="text-xs font-semibold uppercase tracking-[0.18em] opacity-80">יתרה צפויה</p>
        <p className="mt-2 font-display text-3xl font-bold tabular">{fmt(finalBalance)}</p>
        <p className="mt-1 text-xs opacity-80">
          מ־{fmt(balance)} היום · {net >= 0 ? "+" : "−"}{fmt(Math.abs(net))} נטו
        </p>

        <svg viewBox={`0 0 ${W} ${H}`} className="mt-4 h-40 w-full">
          <defs>
            <linearGradient id="area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="oklch(0.2 0.04 180)" stopOpacity="0.35" />
              <stop offset="100%" stopColor="oklch(0.2 0.04 180)" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={areaD} fill="url(#area)" />
          <path d={pathD} fill="none" stroke="oklch(0.2 0.04 180)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          {points.length > 0 && (
            <circle
              cx={points[points.length - 1][0]}
              cy={points[points.length - 1][1]}
              r="4"
              fill="oklch(0.2 0.04 180)"
            />
          )}
        </svg>
        {/* Labels reversed in DOM so RTL flex places them correctly over the LTR SVG */}
        <div className="mt-1 flex justify-between text-[10px] font-medium opacity-70">
          <span>+30 יום</span>
          <span>+15 יום</span>
          <span>היום</span>
        </div>
      </section>

      <section className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-border bg-surface p-4">
          <div className="flex items-center gap-2 text-success">
            <TrendingUp className="h-4 w-4" />
            <p className="text-[11px] font-medium uppercase tracking-wider">צפוי להיכנס</p>
          </div>
          <p className="mt-2 font-display text-xl font-semibold tabular">{fmt(totalIn)}</p>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-4">
          <div className="flex items-center gap-2 text-destructive">
            <TrendingDown className="h-4 w-4" />
            <p className="text-[11px] font-medium uppercase tracking-wider">צפוי לצאת</p>
          </div>
          <p className="mt-2 font-display text-xl font-semibold tabular">{fmt(totalOut)}</p>
        </div>
      </section>

      {/* Daily flow */}
      <section className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">תזרים יומי</h2>
          <div className="flex items-center gap-3">
            <Link
              to="/authorities"
              className="flex items-center gap-1 text-xs font-medium text-muted-foreground"
            >
              <Building2 className="h-3 w-3" />
              רשויות
            </Link>
            <Link
              to="/recurring"
              className="flex items-center gap-1 text-xs font-medium text-primary"
            >
              <Repeat className="h-3 w-3" />
              קבועות
            </Link>
          </div>
        </div>
        {daysWithFlow.length === 0 ? (
          <p className="rounded-2xl border border-border bg-surface p-6 text-center text-sm text-muted-foreground">
            אין פעולות צפויות ב-30 הימים הקרובים.
          </p>
        ) : (
          <ul className="space-y-2">
            {daysWithFlow.slice(0, 10).map((d) => (
              <li
                key={d.date.toISOString()}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-border bg-surface p-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold">{fmtShortDate(d.date)}</p>
                    {d.recurring > 0 && (
                      <span className="flex items-center gap-0.5 rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground">
                        <Repeat className="h-2.5 w-2.5" />
                        קבועה
                      </span>
                    )}
                    {d.authority > 0 && (
                      <span className="flex items-center gap-0.5 rounded-full bg-warning/15 px-1.5 py-0.5 text-[9px] font-medium text-warning">
                        <Building2 className="h-2.5 w-2.5" />
                        רשות
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground tabular">יתרה {fmt(d.balance)}</p>
                </div>
                <div className="text-right text-xs tabular">
                  {d.in > 0 && <p className="font-semibold text-success">+{fmt(d.in)}</p>}
                  {d.out > 0 && <p className="font-semibold text-destructive">−{fmt(d.out)}</p>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </AppShell>
  );
}
