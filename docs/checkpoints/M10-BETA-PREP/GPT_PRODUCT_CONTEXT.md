# GPT_PRODUCT_CONTEXT — M10 Beta Prep

Product and architecture context for GPT sessions continuing from this checkpoint.

---

## Product Vision

Allow an Israeli small business owner to answer:

> "Will I have enough money in the next 30 days?"

within 10 seconds of opening the app.

---

## Product Stage

- **Status:** Beta Ready
- **Milestone:** M10 Beta Prep
- **Tag:** `m10-beta-prep`
- **Next step:** User testing with 5–10 business owners

---

## Target User

Israeli small business owner, typically:
- Sole proprietor or micro-business (1–5 employees)
- Operates in trades, services, workshops, or small contracting
- Not financially trained — needs simplicity, not accounting terminology
- Primary pain point: not knowing if enough cash will arrive before bills are due

---

## MVP Scope — What Is Built

| Module | Description |
|--------|-------------|
| Dashboard | Balance hero, 30-day forecast summary, financial health, overdue alert, quick nav |
| Income | Add expected or received income with VAT |
| Expenses | Add upcoming or paid expenses with VAT |
| Collections | Track open receivables, overdue amounts, cash-in-risk |
| Forecast | 30-day cashflow projection — SVG chart + daily flow list |
| Financial Health | Automated insights: overdue risk, forecast health, cash-in-risk alerts |
| Authority Obligations | VAT, income tax, national insurance, municipality payments |
| VAT Awareness | Output VAT, input VAT, estimated balance — not tax filing |
| Recurring Expenses | Monthly/quarterly/yearly recurring costs, projected forward |
| Reserve Duty Module | Administrative tracking for IDF reserve service — see below |

---

## Reserve Duty Module — Critical Rules

**Purpose:** Administrative tracking only.

Tracks:
- Reserve service periods (dates, number of days)
- Military document collection (4 document types)
- Expected compensation amount and payment status
- Notes

**Rule — never violate:**

Reserve compensation is NOT business revenue.

Never include reserve compensation in:
- Forecast calculations
- Dashboard balance
- Revenue totals
- Cashflow projections
- Financial health score
- Cash-in-risk calculations

The reserve module exists as a separate, isolated tracker. It does not affect any financial number shown in the app.

---

## What Is NOT Built (By Design)

- OCR / receipt scanning
- AI financial assistant
- Open Banking / bank sync
- Multi-user / team accounts
- Authentication / login (localStorage only)
- ERP-style inventory, invoicing, or accounting
- Tax filing

These are excluded deliberately. The MVP is focused on cashflow visibility, not accounting.

---

## Architecture Summary

- **Frontend:** React + TypeScript + TanStack Router
- **Persistence:** localStorage (no backend, no database)
- **Two stores:**
  - Finance Store (`cashflow_os_state`) — all financial data
  - Reserve Store (`reserve_os_state`) — reserve duty only, isolated

The app is fully client-side. No authentication, no server writes, no sync.

---

## Demo Business Profile

The app ships with realistic demo data representing:

**Israeli woodworking workshop + small contractor**

- School woodworking workshops (סדנאות לבתי ספר)
- Deck construction (דקים)
- Pergolas (פרגולות)
- Small contractor projects

Demo customers:
- בית ספר הרצל ירושלים
- תיכון רבין מודיעין
- בית ספר נופי הסלע
- משפחת כהן
- משפחת לוי

Demo suppliers: מחסן העצים, אייס, הום סנטר, סונול

Starting balance: ₪18,500
Typical monthly revenue: ₪15,000–₪40,000

---

## Product Principles

**Prefer:**
- Simplicity — one clear answer per screen
- Mobile-first — 480px max-width, bottom nav, large touch targets
- Fast data entry — minimal fields, smart defaults
- Actionable insights — tell the user what to do, not just what happened

**Avoid:**
- ERP complexity
- Accounting terminology
- Heavy setup flows
- Features that require explanation

---

## Decision Framework

Before adding any feature, it must clearly improve at least one of:

1. **Cash visibility** — does the user understand their balance?
2. **Cash prediction** — does the user know what's coming?
3. **Risk awareness** — does the user see what could go wrong?
4. **Actionability** — does the user know what to do next?

If a proposed feature does not improve any of these — the default answer is **NO**.

---

## Current Known Risks (to validate in user testing)

| Risk | Description |
|------|-------------|
| Forecast understanding | Users may not understand what "projected balance" means |
| Dashboard clarity | Too much information on one screen? |
| Collections workflow | Is the collections flow intuitive for non-technical users? |
| Trust in projections | Will users trust the 30-day forecast or feel it's inaccurate? |
| Reserve module relevance | Will reserve-duty users find the module useful? |

These risks drive the M10 user testing agenda. Sprint C scope will be defined by findings.

---

## Navigation Structure

Bottom navigation bar (fixed — 5 slots including FAB):
- בית (Dashboard)
- פעילות (Transactions)
- + (Add — FAB)
- גבייה (Collections)
- תחזית (Forecast)

Secondary access (from Dashboard quick-action row):
- /recurring (Recurring Expenses)
- /authorities (Authority Obligations)
- /reserve (Reserve Duty)
