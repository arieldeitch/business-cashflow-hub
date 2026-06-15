import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { TxForm } from "@/components/TxForm";

const EXPENSE_CATEGORIES = [
  "שכירות", "תוכנה", "שכר עובדים", "שיווק", "תקשורת", "ייעוץ", "אחר",
];

const searchSchema = z.object({
  party: z.string().optional(),
  amount: z.string().optional(),
  vatExempt: z.string().optional(),
  date: z.string().optional(),
  category: z.string().optional(),
});

export const Route = createFileRoute("/expense")({
  head: () => ({ meta: [{ title: "הוסף הוצאה — Cashflow OS" }] }),
  validateSearch: searchSchema,
  component: ExpenseForm,
});

function ExpenseForm() {
  const search = Route.useSearch();
  return (
    <TxForm
      type="expense"
      title="הוסף הוצאה"
      partyLabel="ספק"
      dateLabel="תאריך פירעון"
      categories={EXPENSE_CATEGORIES}
      accentClass=""
      initialValues={search}
    />
  );
}
