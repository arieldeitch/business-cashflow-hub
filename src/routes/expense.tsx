import { createFileRoute } from "@tanstack/react-router";
import { TxForm } from "@/components/TxForm";

export const Route = createFileRoute("/expense")({
  head: () => ({ meta: [{ title: "Add Expense — Cashflow OS" }] }),
  component: () => (
    <TxForm
      type="expense"
      title="Add Expense"
      partyLabel="Supplier"
      dateLabel="Due Date"
      categories={["Rent", "Software", "Salaries", "Marketing", "Utilities", "Other"]}
      accentClass=""
    />
  ),
});
