import { useSyncExternalStore } from "react";

export type TxType = "income" | "expense";
export type TxStatus = "paid" | "pending" | "overdue";

export interface Transaction {
  id: string;
  type: TxType;
  amount: number;
  party: string; // customer or supplier
  category?: string;
  date: string; // ISO yyyy-mm-dd (due / expected)
  status: TxStatus;
}

const today = new Date();
const iso = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (n: number) => {
  const d = new Date(today);
  d.setDate(d.getDate() + n);
  return iso(d);
};

const seed: Transaction[] = [
  { id: "t1", type: "income", amount: 18500, party: "Aurora Studio", date: addDays(-12), status: "paid" },
  { id: "t2", type: "income", amount: 9200, party: "Nimbus Co.", date: addDays(-3), status: "paid" },
  { id: "t3", type: "income", amount: 14400, party: "Helios Labs", date: addDays(4), status: "pending" },
  { id: "t4", type: "income", amount: 7600, party: "Marlow & Sons", date: addDays(11), status: "pending" },
  { id: "t5", type: "income", amount: 22000, party: "Civic Brand", date: addDays(22), status: "pending" },
  { id: "t6", type: "income", amount: 4300, party: "Petra Goods", date: addDays(-6), status: "overdue" },

  { id: "t7", type: "expense", amount: 5800, party: "WeWork", category: "Rent", date: addDays(2), status: "pending" },
  { id: "t8", type: "expense", amount: 1240, party: "AWS", category: "Software", date: addDays(7), status: "pending" },
  { id: "t9", type: "expense", amount: 3400, party: "Payroll Q1", category: "Salaries", date: addDays(14), status: "pending" },
  { id: "t10", type: "expense", amount: 890, party: "Figma", category: "Software", date: addDays(-1), status: "overdue" },
  { id: "t11", type: "expense", amount: 2100, party: "Sela Marketing", category: "Marketing", date: addDays(18), status: "pending" },
  { id: "t12", type: "expense", amount: 640, party: "Verizon", category: "Utilities", date: addDays(-9), status: "paid" },
];

let state: { balance: number; transactions: Transaction[] } = {
  balance: 42850,
  transactions: seed,
};

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export const financeStore = {
  get: () => state,
  subscribe: (l: () => void) => {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  addTransaction: (tx: Omit<Transaction, "id" | "status"> & { status?: TxStatus }) => {
    const dueDate = new Date(tx.date);
    const status: TxStatus =
      tx.status ?? (dueDate < new Date(iso(today)) ? "overdue" : "pending");
    const newTx: Transaction = { ...tx, id: crypto.randomUUID(), status };
    state = { ...state, transactions: [newTx, ...state.transactions] };
    emit();
  },
};

export function useFinance() {
  return useSyncExternalStore(financeStore.subscribe, financeStore.get, financeStore.get);
}

export const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

export function withinDays(dateISO: string, days: number) {
  const d = new Date(dateISO).getTime();
  const now = Date.now();
  return d >= now - 86400000 && d <= now + days * 86400000;
}
