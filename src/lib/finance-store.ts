import { useSyncExternalStore } from "react";

export type TxType = "income" | "expense";
export type TxStatus = "paid" | "pending" | "overdue";
export type RecurringFrequency = "monthly" | "quarterly" | "yearly";

export interface Transaction {
  id: string;
  type: TxType;
  amountBeforeVat: number;
  vatAmount: number;
  amountIncludingVat: number;
  vatRate: number;
  vatExempt: boolean;
  amount: number; // alias for amountIncludingVat
  party: string;
  category?: string;
  date: string; // ISO yyyy-mm-dd
  status: TxStatus;
}

export interface RecurringExpense {
  id: string;
  name: string;
  amountBeforeVat: number;
  vatAmount: number;
  amountIncludingVat: number;
  vatRate: number;
  vatExempt: boolean;
  amount: number; // alias for amountIncludingVat
  category: string;
  frequency: RecurringFrequency;
  nextDueDate: string; // ISO yyyy-mm-dd — the next upcoming occurrence
}

export interface VatSummary {
  outputVat: number;
  inputVat: number;
  vatBalance: number;
}

// ─── Persistence ────────────────────────────────────────────────────────────

const STORAGE_KEY = "cashflow_os_state";
const STORAGE_VERSION = 2;

type StoreData = {
  balance: number;
  transactions: Transaction[];
  recurringExpenses: RecurringExpense[];
};

type StoragePayload = { version: number; data: StoreData };

/**
 * Converts raw localStorage JSON to StoreData.
 * Add a new branch here whenever the schema changes and bump STORAGE_VERSION.
 */
function migrate(raw: unknown): StoreData | null {
  if (!raw || typeof raw !== "object") return null;
  const p = raw as Record<string, unknown>;

  // v1 → v2: add empty recurringExpenses array
  if (p.version === 1) {
    const d = p.data as Record<string, unknown> | undefined;
    if (d && typeof d.balance === "number" && Array.isArray(d.transactions)) {
      return {
        balance: d.balance,
        transactions: d.transactions as Transaction[],
        recurringExpenses: [],
      };
    }
  }

  // v2: current schema
  if (p.version === 2) {
    const d = p.data as Partial<StoreData> | undefined;
    if (
      d &&
      typeof d.balance === "number" &&
      Array.isArray(d.transactions) &&
      Array.isArray(d.recurringExpenses)
    ) {
      return d as StoreData;
    }
  }

  // Future migrations:
  // if (p.version === 2) { return migrateV2toV3(p.data); }

  return null;
}

function loadState(): StoreData | null {
  try {
    if (typeof localStorage === "undefined") return null;
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return migrate(JSON.parse(raw));
  } catch {
    return null;
  }
}

function saveState(s: StoreData): void {
  try {
    if (typeof localStorage === "undefined") return;
    const payload: StoragePayload = { version: STORAGE_VERSION, data: s };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Storage full or unavailable — fail silently
  }
}

// ─── Seed helpers ────────────────────────────────────────────────────────────

function vatFields(amountBeforeVat: number, vatExempt: boolean) {
  const vatRate = vatExempt ? 0 : 0.17;
  const vatAmount = Math.round(amountBeforeVat * vatRate);
  const amountIncludingVat = amountBeforeVat + vatAmount;
  return { amountBeforeVat, vatAmount, amountIncludingVat, vatRate, vatExempt, amount: amountIncludingVat };
}

const today = new Date();
const iso = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (n: number) => {
  const d = new Date(today);
  d.setDate(d.getDate() + n);
  return iso(d);
};

function buildSeedTransactions(): Transaction[] {
  return [
    { id: "t1",  type: "income",  party: "Wix",          date: addDays(-12), status: "paid",    ...vatFields(15000, false) },
    { id: "t2",  type: "income",  party: "Monday.com",    date: addDays(-3),  status: "paid",    ...vatFields(8000,  false) },
    { id: "t3",  type: "income",  party: "לקוח פרטי",     date: addDays(4),   status: "pending", ...vatFields(12000, false) },
    { id: "t4",  type: "income",  party: "סוכנות דיגיטל", date: addDays(11),  status: "pending", ...vatFields(6500,  false) },
    { id: "t5",  type: "income",  party: "Monday.com",    date: addDays(22),  status: "pending", ...vatFields(18000, false) },
    { id: "t6",  type: "income",  party: "לקוח פרטי",     date: addDays(-6),  status: "overdue", ...vatFields(3500,  false) },
    { id: "t7",  type: "expense", party: "Adobe",          category: "תוכנה",  date: addDays(7),  status: "pending", ...vatFields(1000,  false) },
    { id: "t8",  type: "expense", party: "רואה חשבון",    category: "ייעוץ",  date: addDays(14), status: "pending", ...vatFields(2500,  false) },
    { id: "t9",  type: "expense", party: "פלאפון",         category: "תקשורת", date: addDays(-1), status: "overdue", ...vatFields(800,   false) },
    { id: "t10", type: "expense", party: "Figma",          category: "תוכנה",  date: addDays(18), status: "pending", ...vatFields(1500,  false) },
    { id: "t11", type: "expense", party: "בזק",            category: "תקשורת", date: addDays(-9), status: "paid",    ...vatFields(600,   false) },
  ];
}

function buildSeedRecurring(): RecurringExpense[] {
  return [
    { id: "r1", name: "שכירות משרד",  category: "שכירות",  frequency: "monthly",   nextDueDate: addDays(3),  ...vatFields(5000, false) },
    { id: "r2", name: "רואה חשבון",   category: "ייעוץ",   frequency: "monthly",   nextDueDate: addDays(17), ...vatFields(2500, false) },
    { id: "r3", name: "אינטרנט",       category: "תקשורת",  frequency: "monthly",   nextDueDate: addDays(8),  ...vatFields(300,  false) },
    { id: "r4", name: "ביטוח עסק",    category: "ביטוח",   frequency: "quarterly", nextDueDate: addDays(26), ...vatFields(1200, false) },
  ];
}

// ─── Store ───────────────────────────────────────────────────────────────────

let state: StoreData = loadState() ?? {
  balance: 42850,
  transactions: buildSeedTransactions(),
  recurringExpenses: buildSeedRecurring(),
};

const listeners = new Set<() => void>();

const emit = () => {
  saveState(state);
  listeners.forEach((l) => l());
};

type AddTxPayload = {
  type: TxType;
  amountBeforeVat: number;
  vatExempt: boolean;
  party: string;
  category?: string;
  date: string;
  status?: TxStatus;
};

type RecurringPayload = {
  name: string;
  amountBeforeVat: number;
  vatExempt: boolean;
  category: string;
  frequency: RecurringFrequency;
  nextDueDate: string;
};

export const financeStore = {
  get: () => state,
  subscribe: (l: () => void) => {
    listeners.add(l);
    return () => listeners.delete(l);
  },

  // ── Transactions ──
  addTransaction: (tx: AddTxPayload) => {
    const vatRate = tx.vatExempt ? 0 : 0.17;
    const vatAmount = Math.round(tx.amountBeforeVat * vatRate);
    const amountIncludingVat = tx.amountBeforeVat + vatAmount;
    const dueDate = new Date(tx.date);
    const status: TxStatus = tx.status ?? (dueDate < new Date(iso(today)) ? "overdue" : "pending");
    const newTx: Transaction = {
      id: crypto.randomUUID(),
      type: tx.type,
      party: tx.party,
      category: tx.category,
      date: tx.date,
      status,
      amountBeforeVat: tx.amountBeforeVat,
      vatRate,
      vatAmount,
      amountIncludingVat,
      vatExempt: tx.vatExempt,
      amount: amountIncludingVat,
    };
    state = { ...state, transactions: [newTx, ...state.transactions] };
    emit();
  },
  markAsPaid: (id: string) => {
    state = {
      ...state,
      transactions: state.transactions.map((t) =>
        t.id === id ? { ...t, status: "paid" } : t
      ),
    };
    emit();
  },

  // ── Recurring expenses ──
  addRecurring: (payload: RecurringPayload) => {
    const newExp: RecurringExpense = {
      id: crypto.randomUUID(),
      name: payload.name,
      category: payload.category,
      frequency: payload.frequency,
      nextDueDate: payload.nextDueDate,
      ...vatFields(payload.amountBeforeVat, payload.vatExempt),
    };
    state = { ...state, recurringExpenses: [newExp, ...state.recurringExpenses] };
    emit();
  },
  updateRecurring: (id: string, payload: RecurringPayload) => {
    state = {
      ...state,
      recurringExpenses: state.recurringExpenses.map((r) =>
        r.id === id
          ? { id, name: payload.name, category: payload.category, frequency: payload.frequency, nextDueDate: payload.nextDueDate, ...vatFields(payload.amountBeforeVat, payload.vatExempt) }
          : r
      ),
    };
    emit();
  },
  deleteRecurring: (id: string) => {
    state = { ...state, recurringExpenses: state.recurringExpenses.filter((r) => r.id !== id) };
    emit();
  },

  // ── Reset ──
  resetToDemo: () => {
    state = {
      balance: 42850,
      transactions: buildSeedTransactions(),
      recurringExpenses: buildSeedRecurring(),
    };
    emit();
  },
};

export function useFinance() {
  return useSyncExternalStore(financeStore.subscribe, financeStore.get, financeStore.get);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export const fmt = (n: number) =>
  new Intl.NumberFormat("he-IL", { style: "currency", currency: "ILS", maximumFractionDigits: 0 }).format(n);

export const fmtDate = (isoDate: string): string => {
  const [y, m, d] = isoDate.split("-");
  return `${d}/${m}/${y}`;
};

export const FREQ_LABELS: Record<RecurringFrequency, string> = {
  monthly: "חודשי",
  quarterly: "רבעוני",
  yearly: "שנתי",
};

/** Returns a map of ISO-date → total recurring outflow for a 30-day window. */
export function getRecurringInWindow(
  expenses: RecurringExpense[],
  windowDays: number
): Map<string, number> {
  const result = new Map<string, number>();
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const windowEnd = new Date(now);
  windowEnd.setDate(windowEnd.getDate() + windowDays);

  for (const exp of expenses) {
    const [y, m, d] = exp.nextDueDate.split("-").map(Number);
    const cur = new Date(y, m - 1, d);

    // Advance past dates to the first upcoming occurrence
    while (cur < now) {
      advance(cur, exp.frequency);
    }

    while (cur < windowEnd) {
      const key = localISO(cur);
      result.set(key, (result.get(key) ?? 0) + exp.amount);
      advance(cur, exp.frequency);
    }
  }

  return result;
}

function advance(d: Date, freq: RecurringFrequency) {
  if (freq === "monthly") d.setMonth(d.getMonth() + 1);
  else if (freq === "quarterly") d.setMonth(d.getMonth() + 3);
  else d.setFullYear(d.getFullYear() + 1);
}

/** ISO string from a local Date (avoids UTC-offset day shift). */
export function localISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function getVatSummary(transactions: Transaction[]): VatSummary {
  let outputVat = 0;
  let inputVat = 0;
  for (const t of transactions) {
    if (t.status === "paid") {
      if (t.type === "income") outputVat += t.vatAmount;
      else inputVat += t.vatAmount;
    }
  }
  return { outputVat, inputVat, vatBalance: outputVat - inputVat };
}

export function withinDays(dateISO: string, days: number) {
  const d = new Date(dateISO).getTime();
  const now = Date.now();
  return d >= now - 86400000 && d <= now + days * 86400000;
}
