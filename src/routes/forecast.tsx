import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { AppShell } from "@/components/AppShell";
import { useFinance, fmt } from "@/lib/finance-store";
import { TrendingUp, TrendingDown } from "lucide-react";

export const Route = createFileRoute("/forecast")({
  head: () => ({ meta: [{ title: "Forecast — Cashflow OS" }] }),
  component: Forecast,
});

function Forecast() {
  const { balance, transactions } = useFinance();

  const { days, totalIn, totalOut, finalBalance, minBalance, maxBalance } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dayList: { date: Date; balance: number; in: number; out: number }[] = [];
    let running = balance;
    let totalIn = 0;
    let totalOut = 0;

    for (let i = 0; i < 30; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      const iso = d.toISOString().slice(0, 10);
      let inToday = 0;
      let outToday = 0;
      for (const t of transactions) {
        if (t.date === iso && t.status !== "paid") {
          if (t.type === "income") inToday += t.amount;
          else outToday += t.amount;
        }
      }
      running += inToday - outToday;
      totalIn += inToday;
      totalOut += outToday;
      dayList.push({ date: d, balance: running, in: inToday, out: outToday });
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
  }, [balance, transactions]);

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

  return (
    <AppShell title="30-Day Forecast" subtitle="Cashflow Projection">
      <section
        className="rounded-3xl p-5 text-primary-foreground"
        style={{ background: "var(--gradient-balance)" }}
      >
        <p className="text-xs font-semibold uppercase tracking-[0.18em] opacity-80">Projected Balance</p>
        <p className="mt-2 font-display text-3xl font-bold tabular">{fmt(finalBalance)}</p>
        <p className="mt-1 text-xs opacity-80">
          From {fmt(balance)} today · {net >= 0 ? "+" : "−"}{fmt(Math.abs(net))} net
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
        <div className="mt-1 flex justify-between text-[10px] font-medium opacity-70">
          <span>Today</span>
          <span>+15d</span>
          <span>+30d</span>
        </div>
      </section>

      <section className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-border bg-surface p-4">
          <div className="flex items-center gap-2 text-success">
            <TrendingUp className="h-4 w-4" />
            <p className="text-[11px] font-medium uppercase tracking-wider">Expected In</p>
          </div>
          <p className="mt-2 font-display text-xl font-semibold tabular">{fmt(totalIn)}</p>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-4">
          <div className="flex items-center gap-2 text-destructive">
            <TrendingDown className="h-4 w-4" />
            <p className="text-[11px] font-medium uppercase tracking-wider">Expected Out</p>
          </div>
          <p className="mt-2 font-display text-xl font-semibold tabular">{fmt(totalOut)}</p>
        </div>
      </section>

      <section className="mt-6">
        <h2 className="mb-3 font-display text-lg font-semibold">Daily flow</h2>
        <ul className="space-y-2">
          {days
            .filter((d) => d.in || d.out)
            .slice(0, 8)
            .map((d) => (
              <li
                key={d.date.toISOString()}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-border bg-surface p-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold">
                    {d.date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                  </p>
                  <p className="text-xs text-muted-foreground tabular">Balance {fmt(d.balance)}</p>
                </div>
                <div className="text-right text-xs tabular">
                  {d.in > 0 && <p className="font-semibold text-success">+{fmt(d.in)}</p>}
                  {d.out > 0 && <p className="font-semibold text-destructive">−{fmt(d.out)}</p>}
                </div>
              </li>
            ))}
        </ul>
      </section>
    </AppShell>
  );
}
