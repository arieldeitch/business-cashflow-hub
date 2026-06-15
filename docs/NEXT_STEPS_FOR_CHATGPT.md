# Handoff Note for Next AI Session
*Business Cashflow OS — Post M13 Checkpoint*

---

## What This Project Is

A mobile-first Hebrew RTL web app for Israeli small businesses to track cashflow.
Stack: TanStack Start + React 19 + TanStack Router v1 + Tailwind CSS v4 + localStorage.
No backend, no auth, no AI, no Supabase yet.

The project uses `localStorage` (key: `cashflow_data_v3`, STORAGE_VERSION = 3).
The store is a vanilla JS class with `useSyncExternalStore` for React binding.

---

## What Was Completed Before This Handoff

All of the following milestones are done and committed:

**Sprint B — UX Polish**
- Dashboard empty states with Hebrew copy
- 3-tier overdue highlighting on authority obligations
- VAT awareness explanation card

**M11 — Data Safety & Editability**
- Transaction detail screen at `/transaction/$id`
- Inline edit mode with explicit save
- Two-step delete confirmation, 10-second undo snackbar
- `updatedAt` and `paidAt` fields on transactions
- All list items made tappable

**M12 — Cashflow Accuracy**
- `paidAt` recorded on mark-as-paid
- "באיחור X ימים" label on overdue collections
- Forecast breakdown card on dashboard (single source of truth for projected balance)

**M13 — Fast Entry**
- Duplicate transaction ("שכפל") button on detail screen
- Last-used suggestions (party + category) as one-tap chips on create forms
- "הוסף עוד / סיים" buttons after save

---

## Key Decisions Made

1. **No Supabase yet.** All data is localStorage. Auth/sync is explicitly deferred until there is real user feedback. Do not introduce Supabase without explicit approval.

2. **No new dependencies.** The project has been built without adding libraries beyond what was already in `package.json`. Keep it that way unless there is a very strong reason.

3. **No swipe-to-delete.** Two-step modal confirmation was chosen deliberately to prevent accidental deletion. Do not add gesture-based delete.

4. **Suggestions are not autocomplete.** The last-used suggestion is one chip showing the single most recent party. It is not a dropdown, not a search, not an AI feature. Keep it simple.

5. **Forecast and dashboard must always agree.** Both use `get30DayProjection()` as the single source of truth. Never compute the projected balance in two places.

6. **`/transaction/$id` is a sibling to `/transactions`, NOT a child.** The file is named `transaction.$id.tsx` (singular) to avoid TanStack Router parent/child nesting. Do not rename it.

7. **STORAGE_VERSION is at 3.** Any structural change to `StoreData` requires a new migration step in `migrateData()`. Be careful.

---

## What To Do Next (Suggested Priority Order)

### 1. Real user testing first
Before building anything new, test with 2–3 real Israeli small business owners.
See `USER_TESTING_NOTES.md` for a script.
The most valuable next features depend entirely on what users actually struggle with.

### 2. Backlog items (small, safe)
- **B1** — Collections filter state resets when navigating away. Users lose their tab selection.
- **B2** — Forecast daily list is capped at 10 items. Add a "הצג עוד" expand button.

### 3. Data safety (if continuing after user testing)
- Simple JSON export: one button, downloads `cashflow_backup.json`
- This is low-risk and high-value for beta users who trust the app with real data

### 4. Auth / multi-device (only if product proves value)
If users are actively using the app and asking for cross-device access:
- Introduce Supabase with an Approval Brief (required by project rules in `~/.claude/CLAUDE.md`)
- Migrate localStorage data to Supabase on first login
- Do NOT introduce auth for a feature nobody asked for

---

## Warnings — Do Not Do These

- **Do not add AI/ML features.** No autocomplete, no smart categorization, no LLM integration. Users have not asked for it.
- **Do not add reporting, invoicing, or accounting features.** This is a cashflow visibility tool, not accounting software.
- **Do not add new routes without thinking about the routing tree.** TanStack Router nesting is subtle. Nested routes require `<Outlet />` in the parent.
- **Do not disable RLS, expose service_role keys, or use `USING (true)` on RLS policies** if/when Supabase is introduced. See `~/.claude/CLAUDE.md` for the full security rules.
- **Do not add features because they seem nice.** Add features only when there is observed user pain.

---

## How To Resume Development

```bash
cd "path/to/Itamar cashflow"
npm run dev        # starts TanStack Start dev server (Vite)
```

The local branch is `master`. The remote branch is `main`.
Always push with: `git push origin HEAD:main`

TypeScript check: `npx tsc --noEmit`
