# Beta Test Plan — M10

User testing plan for Business Cashflow OS, M10 Beta Prep.

---

## Objective

Observe 5–10 Israeli small business owners using the app without guidance.

Identify:
- Confusion points
- Missing information
- Navigation issues
- Trust concerns
- Forecast understanding gaps

Use findings to define Sprint C scope.

---

## Session Format

| Field | Value |
|-------|-------|
| Session length | 15–20 minutes |
| Participants | 5–10 Israeli small business owners |
| Observation style | Silent — do not guide users |
| Recording | Notes only (no screen recording required) |
| Language | Hebrew |

---

## Moderator Rules

- Do not explain features.
- Do not correct navigation mistakes.
- Do not answer "how do I…" questions — respond with "what would you expect to happen?"
- Observe and note confusion without resolving it during the session.
- Ask follow-up questions only after the task is completed or abandoned.

---

## Tasks

Present each task as a natural business question. Do not name features or screens.

### Task 1 — Current Balance

> "כמה כסף יש לך עכשיו בעסק?"

Success: User finds the balance on the Dashboard without assistance.

Watch for:
- Does the user understand what the number represents?
- Does the user trust it?
- Do they notice the "עדכון יתרה" button?

---

### Task 2 — Add an Expense

> "הוצאת 850 ₪ על ציוד בטיחות. תוסיף את זה למערכת."

Success: User navigates to expense entry, fills amount and category, submits.

Watch for:
- Is the add flow discoverable (FAB or + button)?
- Does the user understand VAT fields?
- Any confusion about "paid" vs "pending"?

---

### Task 3 — Add Expected Income

> "יש לך לקוח שאמר שישלם 12,000 ₪ בעוד שבועיים. תוסיף את זה."

Success: User adds a pending income transaction with a future date.

Watch for:
- Does the user understand "pending" vs "paid"?
- Does the user look for a specific "income" button or try to use the general + button?
- Does the new entry appear in the Dashboard forecast?

---

### Task 4 — Find Overdue Collection

> "האם יש לך כסף שהיה אמור להגיע ולא הגיע?"

Success: User finds overdue receivables in Collections or the Dashboard overdue alert.

Watch for:
- Does the user navigate to Collections or stay on Dashboard?
- Does the overdue alert banner draw attention?
- Is the difference between "overdue" and "pending" clear?

---

### Task 5 — 30-Day Forecast

> "תסביר לי מה צפוי לקרות לכסף שלך ב-30 הימים הקרובים."

Success: User navigates to Forecast or reads the Dashboard projection, and can explain the projected balance.

Watch for:
- Does the user understand what "יתרה חזויה" means?
- Do they trust the number?
- Do they understand what is included (recurring, pending income, obligations)?
- Does the chart help or confuse?

---

### Task 6 — Authority Obligations

> "מתי אתה צריך לשלם מע״מ?"

Success: User navigates to Authorities and identifies the upcoming VAT payment.

Watch for:
- Is the navigation to Authorities discoverable?
- Does the user understand the difference between VAT obligation and income tax?
- Do they notice the due date?

---

### Task 7 — Reserve Duty Module

> "יש פה אפשרות לעקוב אחרי שירות מילואים. תנסה למצוא אותה ולהסביר לי מה היא עושה."

Success: User locates the Reserve module from the Dashboard, understands its purpose without assistance.

Watch for:
- Is the Shield icon / "מילואים" label discoverable?
- Does the empty state copy explain the purpose clearly?
- Is the distinction between reserve compensation and business income obvious?
- Any confusion about why this exists separately from income?

---

## Observation Form

For each participant, capture:

```
Participant: [number / business type — no names]
Date:
Session length:

Task 1 — Balance
  Result: [ ] Success  [ ] Partial  [ ] Failed
  Notes:

Task 2 — Add Expense
  Result: [ ] Success  [ ] Partial  [ ] Failed
  Notes:

Task 3 — Add Income
  Result: [ ] Success  [ ] Partial  [ ] Failed
  Notes:

Task 4 — Overdue
  Result: [ ] Success  [ ] Partial  [ ] Failed
  Notes:

Task 5 — Forecast
  Result: [ ] Success  [ ] Partial  [ ] Failed
  Notes:

Task 6 — Authorities
  Result: [ ] Success  [ ] Partial  [ ] Failed
  Notes:

Task 7 — Reserve Module
  Result: [ ] Success  [ ] Partial  [ ] Failed
  Notes:

Overall observations:

Top 3 confusion points:

Missing information user asked for:

Trust signals user responded to:

Trust signals user questioned:

Would they use this daily? (yes / no / maybe — direct quote if possible):
```

---

## Success Criteria

The app passes M10 validation if 7 out of 10 participants (or 4 out of 5 in a smaller sample) can answer all of the following without assistance:

| Question | Screen |
|----------|--------|
| How much money do I have right now? | Dashboard |
| What money is expected in the next 30 days? | Dashboard / Forecast |
| What money is overdue? | Collections / Dashboard alert |
| What authority payments are coming? | Authorities |
| Am I at financial risk this month? | Dashboard health card |

---

## Post-Testing Analysis

After all sessions, aggregate observations into:

1. **Top 5 confusion points** (by frequency)
2. **Top 3 missing features** (explicitly requested by users)
3. **Navigation friction list** (screens users struggled to find)
4. **Trust issues** (numbers users questioned)
5. **Forecast comprehension rate** (% who understood projected balance)

Use this list to define the Sprint C backlog.
