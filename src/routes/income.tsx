import { createFileRoute } from "@tanstack/react-router";
import { TxForm } from "@/components/TxForm";

export const Route = createFileRoute("/income")({
  head: () => ({ meta: [{ title: "Add Income — Cashflow OS" }] }),
  component: () => (
    <TxForm
      type="income"
      title="Add Income"
      partyLabel="Customer"
      dateLabel="Expected Date"
      accentClass=""
    />
  ),
});
