import { createFileRoute } from "@tanstack/react-router";
import { TxForm } from "@/components/TxForm";

export const Route = createFileRoute("/expense")({
  head: () => ({ meta: [{ title: "הוסף הוצאה — Cashflow OS" }] }),
  component: () => (
    <TxForm
      type="expense"
      title="הוסף הוצאה"
      partyLabel="ספק"
      dateLabel="תאריך פירעון"
      categories={["שכירות", "תוכנה", "שכר עובדים", "שיווק", "תקשורת", "ייעוץ", "אחר"]}
      accentClass=""
    />
  ),
});
