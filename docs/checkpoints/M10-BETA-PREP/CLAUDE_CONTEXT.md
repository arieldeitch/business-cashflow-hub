# CLAUDE_CONTEXT — M10 Beta Prep

Technical context for Claude Code sessions continuing from this checkpoint.

---

## Current Status

| Field | Value |
|-------|-------|
| Version | M10 Beta Prep |
| Status | Beta Ready |
| Tag | `m10-beta-prep` |
| Latest Commit | `3dea67b` |
| Branch (local) | `master` |
| Branch (remote) | `main` |
| Push command | `git push origin HEAD:main` |

---

## Architecture

**Frontend**
- React 19
- TypeScript
- TanStack Start (SSR on Cloudflare Workers)
- TanStack Router (file-based routing)
- Tailwind CSS v4 (OKLCH color system)

**State**
- Custom `useSyncExternalStore` pattern (not Zustand — context docs may say Zustand but actual implementation uses React's built-in)

**Persistence**
- localStorage only — no backend, no auth, no Supabase

---

## Finance Store

File: `src/lib/finance-store.ts`

Storage key: `cashflow_os_state` | Version: `3` | Migration chain: v1 → v2 → v3

Responsible for:
- Income transactions
- Expense transactions
- Collections (open receivables)
- Recurring expenses
- 30-day forecast projection
- VAT calculations
- Authority obligations (VAT, income tax, national insurance, municipality)
- Financial health score

**Critical functions — do not modify without explicit task:**
- `computeCurrentBalance(data)` — balance = startingBalance + Σ paid income − Σ paid expenses
- `get30DayProjection(data, currentBalance)` — single source of truth for forecast (Dashboard + Forecast screen share this)
- `getVatSummary(transactions)` — output VAT − input VAT
- `getCollectionsSummary(transactions)` — open receivables, cash-in-risk

**Rule:** Finance Store is the single source of truth for all financial calculations. Never split this responsibility.

---

## Reserve Store

File: `src/lib/reserve-store.ts`

Storage key: `reserve_os_state` | Version: `1` | Separate from finance store

Responsible for:
- Reserve service periods (start date, end date, days)
- Military document tracking — 4 types:
  - `tzav_giyus` — צו גיוס
  - `ishur_sherut` — אישור שירות מילואים
  - `ishur_tekufa` — אישור תקופת שירות
  - `bituch_leumi` — אישור תביעה לביטוח לאומי
- Compensation tracking (estimated amount, expected payment date, status: pending/submitted/approved/paid)
- Free-text notes

**Critical isolation rule — NEVER violate:**

Reserve data is informational only. It MUST NEVER affect:
- Dashboard balance
- Forecast (`get30DayProjection`)
- Financial Health calculations
- Cash-In Risk
- VAT calculations (`getVatSummary`)
- Authority obligations
- Income totals
- Expense totals

Do not import `reserve-store.ts` into `finance-store.ts` or any financial calculation.
Do not import `useReserve()` or `reserveStore` in Dashboard, Forecast, or Collections screens.

---

## Route Map

| Route | File | Notes |
|-------|------|-------|
| `/` | `src/routes/index.tsx` | Dashboard |
| `/add` | `src/routes/add.tsx` | Transaction type picker |
| `/income` | `src/routes/income.tsx` | Income form |
| `/expense` | `src/routes/expense.tsx` | Expense form |
| `/transactions` | `src/routes/transactions.tsx` | Full transaction list |
| `/transaction/$id` | `src/routes/transaction.$id.tsx` | Detail/edit/delete |
| `/collections` | `src/routes/collections.tsx` | Open receivables |
| `/authorities` | `src/routes/authorities.tsx` | Tax obligations |
| `/recurring` | `src/routes/recurring.tsx` | Recurring expenses (virtual) |
| `/forecast` | `src/routes/forecast.tsx` | 30-day SVG chart |
| `/reserve` | `src/routes/reserve.tsx` | Reserve duty tracking |

**Bottom nav** (fixed layout — do not add a 6th item):
`[בית] [פעילות] [+ FAB] [גבייה] [תחזית]`

`/recurring`, `/authorities`, `/reserve` are accessible from the dashboard secondary quick-action row.

---

## Demo Business Profile

Business type: Israeli woodworking workshop + contractor.

Activities:
- Woodworking workshops for schools
- Educational construction workshops
- Deck construction
- Pergolas
- Small contractor projects

Typical project value: ₪5,000–₪20,000
Monthly revenue: ₪15,000–₪40,000
Starting balance seed: ₪18,500

Demo customers:
- Institutional: בית ספר הרצל ירושלים, תיכון רבין מודיעין, בית ספר נופי הסלע
- Private: משפחת כהן, משפחת לוי, משפחת אברהם

Demo suppliers: מחסן העצים, אייס, הום סנטר, סונול

Seed data location: `buildSeedTransactions()`, `buildSeedRecurring()`, `buildSeedObligations()` in `finance-store.ts`

---

## Localization

- Hebrew RTL — `lang="he" dir="rtl"` on `<html>`
- Currency: `Intl.NumberFormat("he-IL", { style: "currency", currency: "ILS", maximumFractionDigits: 0 })`
- Dates: DD/MM/YYYY via `fmtDate(isoDate: string)`
- VAT rate: 17% (hardcoded)
- Back buttons: use `ChevronRight` (RTL convention — points right = "back" in Hebrew UI)

---

## Build Status

| Check | Status |
|-------|--------|
| TypeScript (`tsc --noEmit`) | PASS |
| Build (`npm run build`) | PASS |
| Lint (`npm run lint`) | Pre-existing CRLF warnings project-wide (Windows line endings). Not caused by M10 work. New files are LF-clean. |

---

## Open Backlog

| ID | Item | Priority |
|----|------|----------|
| B1 | Collections form reset on filter tab change | Medium |
| B2 | Forecast show more (10-item cap) | Medium |

Do not implement these without explicit instruction. M10 priority is user testing.

---

## Product Rule

Before implementing any feature, ask:

1. Will cash come in?
2. Will cash go out?
3. Is there risk?
4. What should the user do next?

If the feature does not improve any of these — challenge it.

---

## Current Priority

**M10 User Testing** — observe 5–10 business owners using the app.

Do NOT build until testing is complete:
- OCR
- AI Assistant
- Open Banking
- Authentication / Multi-user
- ERP features
- Any feature not backed by user testing findings

Sprint C scope will be defined from user testing findings.
