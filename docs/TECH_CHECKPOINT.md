# Technical Checkpoint — Business Cashflow OS
*Checkpoint: M13 Fast Entry — June 2026*

---

## Stack

| Layer | Technology |
|-------|-----------|
| Framework | TanStack Start (React 19 SSR) |
| Router | TanStack Router v1 (file-based, `@tanstack/react-router ^1.168`) |
| Styling | Tailwind CSS v4, OKLCH color tokens |
| State | `useSyncExternalStore` over a vanilla JS store class |
| Persistence | `localStorage` — STORAGE_VERSION = 3 |
| Hosting | Cloudflare Workers (SSR entry via `app/server.ts`) |
| Language | TypeScript (strict, zero errors at checkpoint) |
| Build | Vite via `@tanstack/router-plugin` |

No Supabase. No auth. No external API calls. No AI.

---

## Directory Layout (key files)

```
src/
  lib/
    finance-store.ts      — core state, localStorage, all business logic
    suggestions.ts        — NEW (M13) last-used suggestions store
  routes/
    index.tsx             — dashboard (balance hero, forecast card, summaries)
    transactions.tsx      — full transaction list
    transaction.$id.tsx   — detail / edit / delete screen (M11+)
    income.tsx            — add income form (now has validateSearch, M13)
    expense.tsx           — add expense form (now has validateSearch, M13)
    collections.tsx       — open receivables list
    authorities.tsx       — authority obligations list
    forecast.tsx          — 30-day SVG chart + daily list
    recurring.tsx         — recurring expense display (virtual, read-only)
    add.tsx               — FAB picker → /income or /expense
  components/
    AppShell.tsx          — layout wrapper, bottom nav
    TxForm.tsx            — shared income/expense form (M13: suggestions, add-another)
  routeTree.gen.ts        — auto-generated + manually patched for /transaction/$id
```

---

## Data Model (`finance-store.ts`)

### `Transaction`
```ts
interface Transaction {
  id: string;
  type: "income" | "expense";
  amountBeforeVat: number;
  vatExempt: boolean;
  vatAmount: number;
  amount: number;            // amountBeforeVat + vatAmount
  party: string;             // customer or supplier name
  category?: string;         // expense only
  date: string;              // ISO date YYYY-MM-DD (expected/due date)
  status: "pending" | "paid" | "overdue";
  createdAt: string;
  updatedAt?: string;        // stamped on every edit (M11)
  paidAt?: string;           // stamped when marked paid (M12)
}
```

### `AuthorityObligation`
```ts
interface AuthorityObligation {
  id: string;
  type: "vat" | "income_tax" | "national_insurance" | "municipality" | "other";
  amount: number;
  dueDate: string;
  description?: string;
  paid: boolean;
  createdAt: string;
}
```

### `StoreData`
```ts
interface StoreData {
  balance: number;           // startingBalance (user-set)
  transactions: Transaction[];
  collections: Transaction[]; // receivables — same shape as transactions
  authorityObligations: AuthorityObligation[];
  recurringExpenses: RecurringExpense[];
  hidden: boolean;           // eye-toggle for sensitive amounts
}
```

### Balance computation
```
currentBalance = startingBalance + Σ(paid income) − Σ(paid expenses)
```
`computeCurrentBalance(data)` is called on every `useFinance()` render.
`financeStore.setBalance(n)` sets `startingBalance` only — never mutates computed balance.

### Forecast engine
`get30DayProjection(data, currentBalance)` — single source of truth.
Used by both `/forecast` route and dashboard breakdown card.
Includes: non-paid transactions with date ≤ today+30, recurring expenses, authority obligations.

---

## `localStorage` Persistence

Key: `cashflow_data_v3`
Migration chain: v1 → v2 → v3 (each step in `migrateData()` in `finance-store.ts`).

New key (M13): `cashflow_suggestions`
Format:
```json
{
  "income":  { "party": "Wix", "category": "" },
  "expense": { "party": "בזק", "category": "תקשורת" }
}
```
Managed by `src/lib/suggestions.ts`. Separate from main store — no migration needed.

---

## Routing Changes (M11–M13)

### `/transaction/$id` (M11)
File: `src/routes/transaction.$id.tsx`
Registered as a root-level route (sibling to `transactions.tsx`, NOT nested inside it).
`routeTree.gen.ts` was manually patched because the dev server was not running during implementation.
Pattern: singular `transaction` vs plural `transactions` avoids TanStack Router parent/child nesting.

### `/income` and `/expense` (M13)
Both now have `validateSearch` with Zod schema accepting optional string params:
`party`, `amount`, `vatExempt`, `date`, and `category` (expense only).
Used by the duplicate transaction flow — values passed as URL search params.

---

## Component Changes (M11–M13)

### `TxForm.tsx` (M13)
- New prop: `initialValues?: InitialValues` — used to prefill form when duplicating
- Loads last-used suggestion from `suggestions.ts` in a `useEffect`
- Shows suggestion chip below party field when field is empty
- After save: shows "סיים / הוסף עוד" inline instead of auto-navigating via setTimeout

### `AppShell.tsx`
Accepts `title`, `subtitle`, or custom `header` prop.
When returning JSX with modals as siblings to `<AppShell>`, the return must be wrapped in `<></>`.

---

## Patterns Established

- **Two-step delete modal**: `deleteStep: 0 | 1 | 2` — Step 1 soft confirm, Step 2 hard confirm, then undo window
- **Undo via snapshot**: delete from store immediately → save snapshot in state → 10s timer → restore from snapshot
- **3-tier urgency**: `daysUntil(dateISO)` → negative=overdue (red), 0-7=urgent (warning/orange), positive=normal
- **Hebrew labels**: `labelDaysUntil(days)` → "לתשלום היום" / "לתשלום בעוד X ימים" / "באיחור X ימים"
- **Hidden toggle**: all currency amounts check `hidden` and render "••••" when true

---

## TypeScript
Zero errors at checkpoint (`npx tsc --noEmit` exits clean).
