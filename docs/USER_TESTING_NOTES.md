# User Testing Script — Business Cashflow OS
*For use with 1–3 real Israeli small business owners*

---

## Before You Start

**Do not explain the app before they use it.** Observation is valuable only when the user encounters the app cold.

Have them open the app on their phone (mobile browser or the deployed URL).
Sit next to them or watch a screen share. Take notes. Do not help unless they are completely stuck for more than 60 seconds.

Remind them: "אין תשובות נכונות ולא נכונות. אנחנו בודקים את האפליקציה, לא אותך."

---

## Session Structure (~30 minutes)

### Part 1 — First impression (5 minutes, no tasks)

Let them open the app and explore freely.

**Observe:**
- Where do they tap first?
- What do they read?
- What confuses them in the first 30 seconds?
- Do they understand what the balance number means?

**Ask after 3 minutes:**
- "מה אתה/את רואה כאן?"
- "מה לדעתך הדבר הראשי שהאפליקציה הזו עושה?"

---

### Part 2 — Core tasks (15 minutes)

Give these tasks one at a time. Do not explain how to do them.

**Task 1: Add income**
"קיבלת תשלום מלקוח בשם 'אלפא בע״מ' על סך 5,000 ₪. הוסף את זה לאפליקציה."

Observe:
- Do they find the + button or the FAB?
- Do they understand "לפני מע״מ"?
- Do they complete the form and save?
- Do they notice the VAT breakdown?

Success: transaction appears in the list.

**Task 2: Mark as paid**
"קיבלת את הכסף בפועל. סמן את ההכנסה כהתקבל."

Observe:
- Do they know to tap the transaction?
- Do they find the "סמן כהתקבל" button?
- Do they notice the balance changed?

Success: status changes to "התקבל".

**Task 3: Add an expense**
"שילמת 800 ₪ לבזק עבור אינטרנט. הוסף את זה."

Observe:
- Do they pick the right category?
- Is the category selection clear?
- Any confusion about the date field?

Success: expense appears in transactions list.

**Task 4: Check forecast**
"כמה כסף אתה/את צפוי/ה להיות איתם בעוד חודש?"

Observe:
- Do they find the forecast screen?
- Do they understand the breakdown card on the dashboard or navigate to /forecast?
- Do they trust the number?

Success: user correctly reads the projected balance.

**Task 5: Find an old transaction and edit it**
"טעית בסכום של אחת ההכנסות. תמצא אותה ותתקן."

Observe:
- Do they know to tap a list item?
- Do they find "ערוך"?
- Is the edit flow clear?
- Do they save?

Success: edit completed, correct amount shown.

---

### Part 3 — Debrief (10 minutes)

**Ask:**
1. "מה הכי קל היה להבין?"
2. "מה הכי קשה או מבלבל?"
3. "אם היית משתמש/ת בזה כל יום — מה היית רוצה שיהיה שונה?"
4. "יש משהו שחיפשת ולא מצאת?"
5. "כמה פעמים בשבוע לדעתך היית פותח/ת את האפליקציה הזו?"

---

## What Counts as Success

The session is successful if the user:
- Completes tasks 1–3 without help
- Understands that the balance reflects actual paid transactions only
- Has at least one moment of "אה, זה שימושי" (spontaneous insight)

The session reveals a critical problem if:
- The user cannot find how to add a transaction without being told
- The user misunderstands what the balance number represents
- The user is confused by the VAT fields (amountBeforeVat vs total)
- The user expects something that doesn't exist and feels blocked

---

## Friction Log (fill during session)

| Moment | What the user did | What they expected | Severity |
|--------|------------------|--------------------|----------|
| | | | |
| | | | |
| | | | |

Severity scale: 1 = minor annoyance, 2 = took extra taps, 3 = blocked / needed help

---

## After the Session

For each friction point with severity ≥ 2, ask:
- Is this a labeling/copy issue (easy fix)?
- Is this a navigation/discoverability issue (medium fix)?
- Is this a fundamental flow issue (needs product rethink)?

Do not promise fixes. Do not build anything until you have seen at least 2 users.
Patterns across users are signal. One person's preference is noise.
