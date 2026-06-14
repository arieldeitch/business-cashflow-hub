import { useSyncExternalStore } from "react";

export type TxType = "income" | "expense";
export type TxStatus = "paid" | "pending" | "overdue";

export interface Transaction {
  id: string;
  type: TxType;
  // VAT-aware amounts
  amountBeforeVat: number;
  vatAmount: number;
  amountIncludingVat: number;
  vatRate: number;     // 0.17 = standard, 0 = exempt
  vatExempt: boolean;
  amount: number;      // alias for amountIncludingVat (used throughout for display)
  party: string;
  category?: string;
  date: string;        // ISO yyyy-mm-dd (due / expected)
  status: TxStatus;
}

export interface VatSummary {
  outputVat: number;  // VAT collected from customers
  inputVat: number;   // VAT paid to suppliers
  vatBalance: number; // positive = owe government, negative = credit
}

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

const seed: Transaction[] = [
  { id: "t1", type: "income", party: "Wix", date: addDays(-12), status: "paid", ...vatFields(15000, false) },
  { id: "t2", type: "income", party: "Monday.com", date: addDays(-3), status: "paid", ...vatFields(8000, false) },
  { id: "t3", type: "income", party: "לקוח פרטי", date: addDays(4), status: "pending", ...vatFields(12000, false) },
  { id: "t4", type: "income", party: "סוכנות דיגיטל", date: addDays(11), status: "pending", ...vatFields(6500, false) },
  { id: "t5", type: "income", party: "Monday.com", date: addDays(22), status: "pending", ...vatFields(18000, false) },
  { id: "t6", type: "income", party: "לקוח פרטי", date: addDays(-6), status: "overdue", ...vatFields(3500, false) },

  { id: "t7", type: "expense", party: "שכירות משרד", category: "שכירות", date: addDays(2), status: "pending", ...vatFields(5000, false) },
  { id: "t8", type: "expense", party: "Adobe", category: "תוכנה", date: addDays(7), status: "pending", ...vatFields(1000, false) },
  { id: "t9", type: "expense", party: "רואה חשבון", category: "ייעוץ", date: addDays(14), status: "pending", ...vatFields(2500, false) },
  { id: "t10", type: "expense", party: "פלאפון", category: "תקשורת", date: addDays(-1), status: "overdue", ...vatFields(800, false) },
  { id: "t11", type: "expense", party: "Figma", category: "תוכנה", date: addDays(18), status: "pending", ...vatFields(1500, false) },
  { id: "t12", type: "expense", party: "בזק", category: "תקשורת", date: addDays(-9), status: "paid", ...vatFields(600, false) },
];

let state: { balance: number; transactions: Transaction[] } = {
  balance: 42850,
  transactions: seed,
};

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

type AddTxPayload = {
  type: TxType;
  amountBeforeVat: number;
  vatExempt: boolean;
  party: string;
  category?: string;
  date: string;
  status?: TxStatus;
};

export const financeStore = {
  get: () => state,
  subscribe: (l: () => void) => {
    listeners.add(l);
    return () => listeners.delete(l);
  },
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
};

export function useFinance() {
  return useSyncExternalStore(financeStore.subscribe, financeStore.get, financeStore.get);
}

export const fmt = (n: number) =>
  new Intl.NumberFormat("he-IL", { style: "currency", currency: "ILS", maximumFractionDigits: 0 }).format(n);

export const fmtDate = (isoDate: string): string => {
  const [y, m, d] = isoDate.split("-");
  return `${d}/${m}/${y}`;
};

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
