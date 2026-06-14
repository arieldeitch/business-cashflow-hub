import { createFileRoute } from "@tanstack/react-router";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { useMemo } from "react";
import { z } from "zod";
import { AppShell } from "@/components/AppShell";
import { useFinance, fmt, type Transaction } from "@/lib/finance-store";

type Filter = "all" | "income" | "expense" | "paid" | "pending" | "overdue";

const searchSchema = z.object({
  filter: z.enum(["all", "income", "expense", "paid", "pending", "overdue"]).optional(),
});

export const Route = createFileRoute("/transactions")({
  head: () => ({ meta: [{ title: "Activity — Cashflow OS" }] }),
  validateSearch: searchSchema,
  component: Transactions,
});

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "income", label: "Income" },
  { id: "expense", label: "Expense" },
  { id: "paid", label: "Paid" },
  { id: "pending", label: "Pending" },
  { id: "overdue", label: "Overdue" },
];

function Transactions() {
  const { transactions } = useFinance();
  const navigate = Route.useNavigate();
  const { filter = "all" } = Route.useSearch();

  const filtered = useMemo(() => {
    return transactions
      .filter((t) => {
        if (filter === "all") return true;
        if (filter === "income" || filter === "expense") return t.type === filter;
        return t.status === filter;
      })
      .sort((a, b) => +new Date(b.date) - +new Date(a.date));
  }, [transactions, filter]);

  const groups = useMemo(() => groupByMonth(filtered), [filtered]);

  return (
    <AppShell title="Activity" subtitle="Transactions">
      <div className="-mx-5 overflow-x-auto px-5 pb-2">
        <div className="flex gap-2">
          {FILTERS.map((f) => {
            const active = filter === f.id;
            return (
              <button
                key={f.id}
                onClick={() => navigate({ search: { filter: f.id === "all" ? undefined : f.id } })}
                className={`shrink-0 rounded-full border px-4 py-1.5 text-xs font-semibold transition ${
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-surface text-muted-foreground"
                }`}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-4 space-y-6">
        {groups.length === 0 && (
          <p className="rounded-2xl border border-border bg-surface p-8 text-center text-sm text-muted-foreground">
            No transactions yet.
          </p>
        )}
        {groups.map(([label, items]) => (
          <section key={label}>
            <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {label}
            </h2>
            <ul className="space-y-2">
              {items.map((t) => (
                <li
                  key={t.id}
                  className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-3"
                >
                  <span
                    className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${
                      t.type === "income" ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"
                    }`}
                  >
                    {t.type === "income" ? <ArrowDownLeft className="h-5 w-5" /> : <ArrowUpRight className="h-5 w-5" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{t.party}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(t.date).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                      {t.category && <span> · {t.category}</span>}
                    </p>
                  </div>
                  <div className="text-right">
                    <p
                      className={`font-display text-sm font-semibold tabular ${
                        t.type === "income" ? "text-success" : "text-foreground"
                      }`}
                    >
                      {t.type === "income" ? "+" : "−"}
                      {fmt(t.amount)}
                    </p>
                    <StatusPill status={t.status} />
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </AppShell>
  );
}

function StatusPill({ status }: { status: Transaction["status"] }) {
  const map = {
    paid: "bg-success/15 text-success",
    pending: "bg-muted text-muted-foreground",
    overdue: "bg-warning/15 text-warning",
  } as const;
  return (
    <span className={`mt-0.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${map[status]}`}>
      {status}
    </span>
  );
}

function groupByMonth(items: Transaction[]): [string, Transaction[]][] {
  const map = new Map<string, Transaction[]>();
  for (const t of items) {
    const label = new Date(t.date).toLocaleDateString("en-US", { month: "long", year: "numeric" });
    if (!map.has(label)) map.set(label, []);
    map.get(label)!.push(t);
  }
  return Array.from(map.entries());
}
