import { createFileRoute } from "@tanstack/react-router";
import { TxForm } from "@/components/TxForm";

export const Route = createFileRoute("/income")({
  head: () => ({ meta: [{ title: "הוסף הכנסה — Cashflow OS" }] }),
  component: () => (
    <TxForm
      type="income"
      title="הוסף הכנסה"
      partyLabel="לקוח"
      dateLabel="תאריך צפוי"
      accentClass=""
    />
  ),
});
