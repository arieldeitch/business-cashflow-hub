import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowDownLeft, ArrowUpRight, ChevronLeft } from "lucide-react";

export const Route = createFileRoute("/add")({
  head: () => ({ meta: [{ title: "New Entry — Cashflow OS" }] }),
  component: AddPicker,
});

function AddPicker() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex min-h-screen max-w-[480px] flex-col px-5 pt-8">
        <header className="flex items-center gap-3">
          <Link to="/" className="grid h-10 w-10 place-items-center rounded-full border border-border bg-surface">
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">New</p>
            <h1 className="font-display text-2xl font-semibold">What's this?</h1>
          </div>
        </header>

        <div className="mt-8 space-y-3">
          <Link
            to="/income"
            className="flex items-center gap-4 rounded-3xl border border-border bg-surface p-5 transition active:scale-[0.98]"
          >
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-success/15 text-success">
              <ArrowDownLeft className="h-6 w-6" strokeWidth={2.4} />
            </span>
            <div>
              <p className="font-display text-lg font-semibold">Income</p>
              <p className="text-xs text-muted-foreground">Money coming in from a customer</p>
            </div>
          </Link>

          <Link
            to="/expense"
            className="flex items-center gap-4 rounded-3xl border border-border bg-surface p-5 transition active:scale-[0.98]"
          >
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-destructive/15 text-destructive">
              <ArrowUpRight className="h-6 w-6" strokeWidth={2.4} />
            </span>
            <div>
              <p className="font-display text-lg font-semibold">Expense</p>
              <p className="text-xs text-muted-foreground">A bill or cost going out</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
