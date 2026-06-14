import { useSyncExternalStore } from "react";

export type TxType = "income" | "expense";
export type TxStatus = "paid" | "pending" | "overdue";
export type RecurringFrequency = "monthly" | "quarterly" | "yearly";
export type AuthorityType =
  | "vat"
  | "income_tax"
  | "national_insurance"
  | "municipality"
  | "other";

export interface Transaction {
  id: string;
  type: TxType;
  amountBeforeVat: number;
  vatAmount: number;
  amountIncludingVat: number;
  vatRate: number;
  vatExempt: boolean;
  amount: number;
  party: string;
  category?: string;
  date: string;
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
  amount: number;
  category: string;
  frequency: RecurringFrequency;
  nextDueDate: string;
}

export interface AuthorityObligation {
  id: string;
  authority: AuthorityType;
  amount: number;
  dueDate: string;
  status: "pending" | "paid";
  notes?: string;
  createdAt: string;
}

export interface VatSummary {
  outputVat: number;
  inputVat: number;
  vatBalance: number;
}

export interface CollectionsSummary {
  totalOpenReceivables: number;
  totalOverdueReceivables: number;
  openReceivablesCount: number;
  overdueReceivablesCount: number;
  overdueCustomersCount: number;
  cashInRisk: number;
}

// ─── Persistence ────────────────────────────────────────────────────────────

const STORAGE_KEY = "cashflow_os_state";
const STORAGE_VERSION = 3;

type StoreData = {
  balance: number;
  transactions: Transaction[];
  recurringExpenses: RecurringExpense[];
  authorityObligations: AuthorityObligation[];
};

type StoragePayload = { version: number; data: StoreData };

/**
 * Converts raw localStorage JSON to StoreData.
 * Add a new branch here whenever the schema changes, then bump STORAGE_VERSION.
 */
function migrate(raw: unknown): StoreData | null {
  if (!raw || typeof raw !== "object") return null;
  const p = raw as Record<string, unknown>;

  // v1 → v3: add recurringExpenses + authorityObligations
  if (p.version === 1) {
    const d = p.data as Record<string, unknown> | undefined;
    if (d && typeof d.balance === "number" && Array.isArray(d.transactions)) {
      return {
        balance: d.balance,
        transactions: d.transactions as Transaction[],
        recurringExpenses: [],
        authorityObligations: [],
      };
    }
  }

  // v2 → v3: add authorityObligations
  if (p.version === 2) {
    const d = p.data as Partial<StoreData> | undefined;
    if (d && typeof d.balance === "number" && Array.isArray(d.transactions) && Array.isArray(d.recurringExpenses)) {
      return {
        balance: d.balance,
        transactions: d.transactions as Transaction[],
        recurringExpenses: d.recurringExpenses as RecurringExpense[],
        authorityObligations: [],
      };
    }
  }

  // v3: current schema
  if (p.version === 3) {
    const d = p.data as Partial<StoreData> | undefined;
    if (
      d &&
      typeof d.balance === "number" &&
      Array.isArray(d.transactions) &&
      Array.isArray(d.recurringExpenses) &&
      Array.isArray(d.authorityObligations)
    ) {
      return d as StoreData;
    }
  }

  // Future migrations:
  // if (p.version === 3) { return migrateV3toV4(p.data); }

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
    { id: "t1",  type: "income",  party: "Wix",           date: addDays(-12), status: "paid",    ...vatFields(15000, false) },
    { id: "t2",  type: "income",  party: "Monday.com",     date: addDays(-3),  status: "paid",    ...vatFields(8000,  false) },
    { id: "t3",  type: "income",  party: "לקוח פרטי",      date: addDays(4),   status: "pending", ...vatFields(12000, false) },
    { id: "t4",  type: "income",  party: "סוכנות דיגיטל",  date: addDays(11),  status: "pending", ...vatFields(6500,  false) },
    { id: "t5",  type: "income",  party: "Monday.com",     date: addDays(22),  status: "pending", ...vatFields(18000, false) },
    { id: "t6",  type: "income",  party: "לקוח פרטי",      date: addDays(-6),  status: "overdue", ...vatFields(3500,  false) },
    { id: "t7",  type: "expense", party: "Adobe",           category: "תוכנה",  date: addDays(7),  status: "pending", ...vatFields(1000,  false) },
    { id: "t8",  type: "expense", party: "רואה חשבון",     category: "ייעוץ",  date: addDays(14), status: "pending", ...vatFields(2500,  false) },
    { id: "t9",  type: "expense", party: "פלאפון",          category: "תקשורת", date: addDays(-1), status: "overdue", ...vatFields(800,   false) },
    { id: "t10", type: "expense", party: "Figma",           category: "תוכנה",  date: addDays(18), status: "pending", ...vatFields(1500,  false) },
    { id: "t11", type: "expense", party: "בזק",             category: "תקשורת", date: addDays(-9), status: "paid",    ...vatFields(600,   false) },
  ];
}

function buildSeedRecurring(): RecurringExpense[] {
  return [
    { id: "r1", name: "שכירות משרד", category: "שכירות", frequency: "monthly",   nextDueDate: addDays(3),  ...vatFields(5000, false) },
    { id: "r2", name: "רואה חשבון",  category: "ייעוץ",  frequency: "monthly",   nextDueDate: addDays(17), ...vatFields(2500, false) },
    { id: "r3", name: "אינטרנט",      category: "תקשורת", frequency: "monthly",   nextDueDate: addDays(8),  ...vatFields(300,  false) },
    { id: "r4", name: "ביטוח עסק",   category: "ביטוח",  frequency: "quarterly", nextDueDate: addDays(26), ...vatFields(1200, false) },
  ];
}

function buildSeedObligations(): AuthorityObligation[] {
  const now = new Date().toISOString();
  return [
    { id: "ao1", authority: "vat",                amount: 6420, dueDate: addDays(8),  status: "pending", createdAt: now },
    { id: "ao2", authority: "national_insurance",  amount: 1900, dueDate: addDays(14), status: "pending", createdAt: now },
    { id: "ao3", authority: "income_tax",          amount: 2800, dueDate: addDays(21), status: "pending", createdAt: now },
  ];
}

// ─── Store ───────────────────────────────────────────────────────────────────

let state: StoreData = loadState() ?? {
  balance: 42850,
  transactions: buildSeedTransactions(),
  recurringExpenses: buildSeedRecurring(),
  authorityObligations: buildSeedObligations(),
};

const listeners = new Set<() => void>();

const emit = () => {
  cachedSnapshot = null;
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

type ObligationPayload = {
  authority: AuthorityType;
  amount: number;
  dueDate: string;
  notes?: string;
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
    state = { ...state, transactions: state.transactions.map((t) => t.id === id ? { ...t, status: "paid" } : t) };
    emit();
  },
  deleteTransaction: (id: string) => {
    state = { ...state, transactions: state.transactions.filter((t) => t.id !== id) };
    emit();
  },
  updateTransaction: (id: string, payload: { party: string; amountBeforeVat: number; vatExempt: boolean; date: string; category?: string }) => {
    const vatRate = payload.vatExempt ? 0 : 0.17;
    const vatAmount = Math.round(payload.amountBeforeVat * vatRate);
    const amountIncludingVat = payload.amountBeforeVat + vatAmount;
    state = {
      ...state,
      transactions: state.transactions.map((t) => {
        if (t.id !== id) return t;
        const [y, m, d] = payload.date.split("-").map(Number);
        const dueDate = new Date(y, m - 1, d);
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const status: TxStatus = t.status === "paid" ? "paid" : dueDate < todayStart ? "overdue" : "pending";
        return {
          ...t,
          party: payload.party,
          category: payload.category,
          date: payload.date,
          status,
          amountBeforeVat: payload.amountBeforeVat,
          vatRate,
          vatAmount,
          amountIncludingVat,
          vatExempt: payload.vatExempt,
          amount: amountIncludingVat,
        };
      }),
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

  // ── Authority obligations ──
  addAuthorityObligation: (payload: ObligationPayload) => {
    const newObl: AuthorityObligation = {
      id: crypto.randomUUID(),
      authority: payload.authority,
      amount: payload.amount,
      dueDate: payload.dueDate,
      status: "pending",
      notes: payload.notes,
      createdAt: new Date().toISOString(),
    };
    state = { ...state, authorityObligations: [newObl, ...state.authorityObligations] };
    emit();
  },
  updateAuthorityObligation: (id: string, payload: ObligationPayload) => {
    state = {
      ...state,
      authorityObligations: state.authorityObligations.map((o) =>
        o.id === id
          ? { ...o, authority: payload.authority, amount: payload.amount, dueDate: payload.dueDate, notes: payload.notes }
          : o
      ),
    };
    emit();
  },
  deleteAuthorityObligation: (id: string) => {
    state = { ...state, authorityObligations: state.authorityObligations.filter((o) => o.id !== id) };
    emit();
  },
  markAuthorityObligationPaid: (id: string) => {
    state = { ...state, authorityObligations: state.authorityObligations.map((o) => o.id === id ? { ...o, status: "paid" } : o) };
    emit();
  },

  // ── Balance ──
  setBalance: (n: number) => {
    state = { ...state, balance: n };
    emit();
  },

  // ── Reset ──
  resetToDemo: () => {
    state = {
      balance: 42850,
      transactions: buildSeedTransactions(),
      recurringExpenses: buildSeedRecurring(),
      authorityObligations: buildSeedObligations(),
    };
    emit();
  },
};

// ─── Dynamic balance ─────────────────────────────────────────────────────────

export function computeCurrentBalance(data: StoreData): number {
  let b = data.balance; // user-set starting balance
  for (const t of data.transactions) {
    if (t.status === "paid") {
      b += t.type === "income" ? t.amount : -t.amount;
    }
  }
  return b;
}

export type FinanceState = StoreData & { startingBalance: number };

let cachedSnapshot: FinanceState | null = null;

function getSnapshot(): FinanceState {
  if (cachedSnapshot === null) {
    cachedSnapshot = {
      ...state,
      startingBalance: state.balance,
      balance: computeCurrentBalance(state),
    };
  }
  return cachedSnapshot;
}

export function useFinance(): FinanceState {
  return useSyncExternalStore(financeStore.subscribe, getSnapshot, getSnapshot);
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

export const AUTHORITY_LABELS: Record<AuthorityType, string> = {
  vat: 'מע"מ',
  income_tax: "מס הכנסה",
  national_insurance: "ביטוח לאומי",
  municipality: "עירייה",
  other: "אחר",
};

export const AUTHORITY_COLORS: Record<AuthorityType, string> = {
  vat: "bg-warning/15 text-warning",
  income_tax: "bg-destructive/15 text-destructive",
  national_insurance: "bg-primary/15 text-primary",
  municipality: "bg-success/15 text-success",
  other: "bg-muted text-muted-foreground",
};

/** Days from today to the given ISO date (negative = overdue). */
export function daysUntil(dateISO: string): number {
  const [y, m, d] = dateISO.split("-").map(Number);
  const due = new Date(y, m - 1, d);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.round((due.getTime() - now.getTime()) / 86400000);
}

/** Human-readable label for days until due. */
export function labelDaysUntil(days: number): string {
  if (days === 0) return "היום";
  if (days < 0) return `באיחור ${Math.abs(days)} ימים`;
  return `בעוד ${days} ימים`;
}

/** Returns pending obligations sorted by dueDate ascending. */
export function getUpcomingAuthorityObligations(
  obligations: AuthorityObligation[],
  limit?: number
): AuthorityObligation[] {
  const result = obligations
    .filter((o) => o.status === "pending")
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  return limit !== undefined ? result.slice(0, limit) : result;
}

/** Returns a map of ISO-date → total recurring outflow for a window. */
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
    while (cur < now) advance(cur, exp.frequency);
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

/** All income transactions that are not yet paid. */
export function getOpenReceivables(transactions: Transaction[]): Transaction[] {
  return transactions.filter((t) => t.type === "income" && (t.status === "pending" || t.status === "overdue"));
}

/** All income transactions that are overdue. */
export function getOverdueReceivables(transactions: Transaction[]): Transaction[] {
  return transactions.filter((t) => t.type === "income" && t.status === "overdue");
}

/**
 * cashInRisk = overdue income + pending income due within the next 7 days.
 * Highlights money that needs immediate attention.
 */
export function getCollectionsSummary(transactions: Transaction[]): CollectionsSummary {
  const open = getOpenReceivables(transactions);
  const overdue = getOverdueReceivables(transactions);
  const totalOpenReceivables = open.reduce((s, t) => s + t.amount, 0);
  const totalOverdueReceivables = overdue.reduce((s, t) => s + t.amount, 0);
  const overdueCustomers = new Set(overdue.map((t) => t.party));

  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const sevenDays = new Date(now);
  sevenDays.setDate(sevenDays.getDate() + 7);
  const sevenDaysISO = localISO(sevenDays);

  const cashInRisk = transactions
    .filter((t) => t.type === "income" && t.status !== "paid")
    .reduce((s, t) => {
      if (t.status === "overdue") return s + t.amount;
      if (t.status === "pending" && t.date <= sevenDaysISO) return s + t.amount;
      return s;
    }, 0);

  return {
    totalOpenReceivables,
    totalOverdueReceivables,
    openReceivablesCount: open.length,
    overdueReceivablesCount: overdue.length,
    overdueCustomersCount: overdueCustomers.size,
    cashInRisk,
  };
}
