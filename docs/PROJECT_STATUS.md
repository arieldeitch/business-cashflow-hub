# Project Status — Business Cashflow OS
*Checkpoint: M13 Fast Entry — June 2026*

---

## MVP State

The product is feature-complete for beta testing with real Israeli small-business users.
Core cashflow loop is fully functional end-to-end:

- User sets starting balance
- Adds income and expense transactions with VAT breakdown
- Marks items as paid (stamps actual payment date)
- Tracks open collections (receivables) and authority obligations (VAT, income tax, etc.)
- Sees a 30-day cashflow forecast with projected balance
- Manages all data inline — edit, delete with undo, duplicate

No server, no auth, no sync. All data lives in the browser's `localStorage`.

---

## Completed Milestones

### Sprint B — UX Polish
- Dashboard empty states with Hebrew CTA copy for each zero-data section
- 3-tier overdue highlighting on authority obligations: red (overdue), orange (≤7 days), normal
- VAT awareness explanation card explaining that collected VAT is not free cash

### M11 — Data Safety & Editability
- Transaction detail screen at `/transaction/$id` — tap any transaction to open
- Inline edit mode (party, amount, VAT toggle, date, category) with explicit Save
- Two-step delete confirmation modal (no accidental deletes)
- 10-second undo snackbar after deletion — full restore from snapshot
- `updatedAt` field stamped on every edit, shown in detail view
- `paidAt` field stamped on mark-as-paid, shown in detail view
- `restoreTransaction` / `restoreAuthorityObligation` methods on store
- All list items in transactions, collections, and authorities are tappable

### M12 — Cashflow Accuracy
- `paidAt` date recorded when marking income/expense as paid
- "באיחור X ימים" label on overdue collection items
- Forecast breakdown card on dashboard: current balance → expected income → expected expenses → projected balance (replaced two scattered StatCards)
- Forecast and dashboard always show identical projected balance (single source of truth: `get30DayProjection`)

### M13 — Fast Entry
- **Duplicate transaction**: "שכפל" button on detail screen — opens the create form prefilled with original party, amount, VAT setting, and category; date defaults to today
- **Last-used suggestions**: after any save, the most recent party name (and category for expenses) is stored and shown as a one-tap chip on the next form open
- **"הוסף עוד / סיים" flow**: after saving, user chooses to stay and enter another item (form resets, keeping category and VAT setting) or navigate to the transaction list

---

## Product Readiness

| Area | Status |
|------|--------|
| Balance tracking | ✅ Solid |
| Income entry + VAT | ✅ Solid |
| Expense entry + VAT | ✅ Solid |
| Collections (receivables) | ✅ Solid |
| Authority obligations | ✅ Solid |
| 30-day forecast | ✅ Solid |
| Transaction detail / edit | ✅ Solid |
| Safe delete + undo | ✅ Solid |
| Duplicate transaction | ✅ Solid |
| Fast entry (suggestions, add-another) | ✅ Solid |
| Hebrew RTL layout | ✅ Solid |
| VAT awareness display | ✅ Solid |
| Recurring expenses (virtual) | ✅ Read-only display |
| Data export / backup | ❌ Not built |
| Multi-device sync | ❌ Not built |
| Auth / user accounts | ❌ Not built |
| Notifications / reminders | ❌ Not built |
| Invoicing / reporting | ❌ Out of scope |

---

## Intentionally Deferred

These are known gaps that were explicitly left out:

- **Export / backup** — no JSON export or data portability yet. localStorage only. Risk: user loses data on browser clear.
- **Forecast V2** — the 30-day chart is functional but the 10-item cap on the daily list remains (backlog item B2).
- **Collections filter reset** — filter tab state resets on navigation (backlog item B1).
- **Auth / sync** — single-device, no accounts. Supabase not yet introduced. This is the biggest open architectural question.
- **Push notifications** — due-date reminders would require a service worker; not started.

---

## Known Risks

1. **Data loss** — all data is in `localStorage`. No server backup. One browser clear = everything gone. Must communicate clearly to beta users.
2. **Single device** — data does not follow the user to another device or browser. Not a bug but a known limitation to disclose.
3. **No offline-first guarantee** — the app is hosted on Cloudflare Workers (SSR). If the CDN is unreachable, the user cannot load the app even though all data is local.
4. **STORAGE_VERSION migration chain** — currently at v3. Any structural change to `StoreData` requires a new migration step. This becomes fragile if rushed.
5. **No real-user feedback yet** — all design decisions were made by the product owner without observing actual users. Fast Entry assumptions (last-used suggestions, duplicate) may not match real workflows.
