import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { TxForm } from "@/components/TxForm";

const searchSchema = z.object({
  party: z.string().optional(),
  amount: z.string().optional(),
  vatExempt: z.string().optional(),
  date: z.string().optional(),
});

export const Route = createFileRoute("/income")({
  head: () => ({ meta: [{ title: "הוסף הכנסה — Cashflow OS" }] }),
  validateSearch: searchSchema,
  component: IncomeForm,
});

function IncomeForm() {
  const search = Route.useSearch();
  return (
    <TxForm
      type="income"
      title="הוסף הכנסה"
      partyLabel="לקוח"
      dateLabel="תאריך צפוי"
      accentClass=""
      initialValues={search}
    />
  );
}
