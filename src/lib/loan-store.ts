import { useSyncExternalStore } from "react";

const LOANS_STORAGE_KEY = "cashflow_loans_v1";

export interface Loan {
  id: string;
  name: string;
  lender: string;
  remainingBalance: number;
  monthlyPayment: number;
  remainingPayments: number;
  nextPaymentDate?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type LoanPayload = {
  name: string;
  lender: string;
  remainingBalance: number;
  monthlyPayment: number;
  remainingPayments: number;
  nextPaymentDate?: string;
  notes?: string;
};

type LoansData = { loans: Loan[] };

function loadLoans(): LoansData {
  try {
    if (typeof localStorage === "undefined") return { loans: [] };
    const raw = localStorage.getItem(LOANS_STORAGE_KEY);
    if (!raw) return { loans: [] };
    const parsed = JSON.parse(raw) as { loans?: unknown };
    if (parsed && Array.isArray(parsed.loans)) return { loans: parsed.loans as Loan[] };
  } catch {
    // ignore
  }
  return { loans: [] };
}

function saveLoans(data: LoansData): void {
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(LOANS_STORAGE_KEY, JSON.stringify(data));
  } catch {
    // ignore
  }
}

let state: LoansData = loadLoans();
const listeners = new Set<() => void>();
let cachedSnapshot: LoansData | null = null;

const emit = () => {
  cachedSnapshot = null;
  saveLoans(state);
  listeners.forEach((l) => l());
};

function getSnapshot(): LoansData {
  if (cachedSnapshot === null) cachedSnapshot = { ...state };
  return cachedSnapshot;
}

export const loanStore = {
  get: () => state,
  subscribe: (l: () => void) => {
    listeners.add(l);
    return () => listeners.delete(l);
  },

  addLoan: (payload: LoanPayload) => {
    const now = new Date().toISOString();
    const loan: Loan = {
      id: crypto.randomUUID(),
      name: payload.name,
      lender: payload.lender,
      remainingBalance: payload.remainingBalance,
      monthlyPayment: payload.monthlyPayment,
      remainingPayments: payload.remainingPayments,
      nextPaymentDate: payload.nextPaymentDate || undefined,
      notes: payload.notes || undefined,
      createdAt: now,
      updatedAt: now,
    };
    state = { ...state, loans: [loan, ...state.loans] };
    emit();
  },

  updateLoan: (id: string, payload: LoanPayload) => {
    state = {
      ...state,
      loans: state.loans.map((l) =>
        l.id === id
          ? {
              ...l,
              name: payload.name,
              lender: payload.lender,
              remainingBalance: payload.remainingBalance,
              monthlyPayment: payload.monthlyPayment,
              remainingPayments: payload.remainingPayments,
              nextPaymentDate: payload.nextPaymentDate || undefined,
              notes: payload.notes || undefined,
              updatedAt: new Date().toISOString(),
            }
          : l,
      ),
    };
    emit();
  },

  deleteLoan: (id: string) => {
    state = { ...state, loans: state.loans.filter((l) => l.id !== id) };
    emit();
  },
};

export function useLoans(): LoansData {
  return useSyncExternalStore(loanStore.subscribe, getSnapshot, getSnapshot);
}

export function getTotalLoanBalance(loans: Loan[]): number {
  return loans.reduce((sum, l) => sum + l.remainingBalance, 0);
}

export function getTotalMonthlyLoanPayments(loans: Loan[]): number {
  return loans.reduce((sum, l) => sum + l.monthlyPayment, 0);
}

export function getTotalRemainingPayments(loans: Loan[]): number {
  return loans.reduce((sum, l) => sum + l.remainingPayments, 0);
}

/** Returns a map of ISO-date → total loan outflow for a window (mirrors getRecurringInWindow). */
export function getLoanPaymentsInWindow(loans: Loan[], windowDays: number): Map<string, number> {
  const result = new Map<string, number>();
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const windowEnd = new Date(now);
  windowEnd.setDate(windowEnd.getDate() + windowDays);

  for (const loan of loans) {
    if (!loan.nextPaymentDate || loan.remainingPayments <= 0) continue;
    const [y, m, d] = loan.nextPaymentDate.split("-").map(Number);
    const cur = new Date(y, m - 1, d);
    let paymentsLeft = loan.remainingPayments;
    while (cur < now && paymentsLeft > 0) {
      cur.setMonth(cur.getMonth() + 1);
      paymentsLeft--;
    }
    while (cur < windowEnd && paymentsLeft > 0) {
      const key = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, "0")}-${String(cur.getDate()).padStart(2, "0")}`;
      result.set(key, (result.get(key) ?? 0) + loan.monthlyPayment);
      cur.setMonth(cur.getMonth() + 1);
      paymentsLeft--;
    }
  }

  return result;
}
