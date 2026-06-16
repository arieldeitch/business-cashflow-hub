import { useSyncExternalStore } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export type DocType =
  | "tzav_giyus"
  | "ishur_sherut"
  | "ishur_tekufa"
  | "bituch_leumi";

export type CompensationStatus = "pending" | "submitted" | "approved" | "paid";

export interface ReserveDocument {
  type: DocType;
  received: boolean;
  receivedDate?: string; // ISO YYYY-MM-DD
}

export interface ReserveCompensation {
  estimatedAmount: number;
  expectedPaymentDate?: string;
  status: CompensationStatus;
}

export interface ReservePeriod {
  id: string;
  startDate: string; // ISO YYYY-MM-DD
  endDate: string;
  days: number;
  documents: ReserveDocument[];
  compensation: ReserveCompensation;
  notes: string;
  createdAt: string;
}

// ─── Persistence ──────────────────────────────────────────────────────────────

const STORAGE_KEY = "reserve_os_state";
const STORAGE_VERSION = 1;

type ReserveStoreData = {
  periods: ReservePeriod[];
};

type StoragePayload = { version: number; data: ReserveStoreData };

function loadState(): ReserveStoreData | null {
  try {
    if (typeof localStorage === "undefined") return null;
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as StoragePayload;
    if (p.version === 1 && p.data && Array.isArray(p.data.periods)) {
      return p.data as ReserveStoreData;
    }
    return null;
  } catch {
    return null;
  }
}

function saveState(s: ReserveStoreData): void {
  try {
    if (typeof localStorage === "undefined") return;
    const payload: StoragePayload = { version: STORAGE_VERSION, data: s };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Storage unavailable — fail silently
  }
}

// ─── Default documents ────────────────────────────────────────────────────────

export const DOC_LABELS: Record<DocType, string> = {
  tzav_giyus: "צו גיוס",
  ishur_sherut: "אישור שירות מילואים",
  ishur_tekufa: "אישור תקופת שירות",
  bituch_leumi: "אישור תביעה לביטוח לאומי",
};

export const COMPENSATION_STATUS_LABELS: Record<CompensationStatus, string> = {
  pending: "ממתין",
  submitted: "הוגש",
  approved: "אושר",
  paid: "שולם",
};

const ALL_DOC_TYPES: DocType[] = [
  "tzav_giyus",
  "ishur_sherut",
  "ishur_tekufa",
  "bituch_leumi",
];

function defaultDocuments(): ReserveDocument[] {
  return ALL_DOC_TYPES.map((type) => ({ type, received: false }));
}

// ─── Store ────────────────────────────────────────────────────────────────────

let state: ReserveStoreData = loadState() ?? { periods: [] };

const listeners = new Set<() => void>();

const emit = () => {
  cachedSnapshot = null;
  saveState(state);
  listeners.forEach((l) => l());
};

export type AddPeriodPayload = {
  startDate: string;
  endDate: string;
  days: number;
  estimatedAmount: number;
  expectedPaymentDate?: string;
  notes: string;
};

export const reserveStore = {
  get: () => state,
  subscribe: (l: () => void) => {
    listeners.add(l);
    return () => listeners.delete(l);
  },

  addPeriod: (payload: AddPeriodPayload) => {
    const period: ReservePeriod = {
      id: crypto.randomUUID(),
      startDate: payload.startDate,
      endDate: payload.endDate,
      days: payload.days,
      documents: defaultDocuments(),
      compensation: {
        estimatedAmount: payload.estimatedAmount,
        expectedPaymentDate: payload.expectedPaymentDate,
        status: "pending",
      },
      notes: payload.notes,
      createdAt: new Date().toISOString(),
    };
    state = { periods: [period, ...state.periods] };
    emit();
  },

  updatePeriod: (id: string, payload: Partial<Pick<ReservePeriod, "startDate" | "endDate" | "days" | "notes">>) => {
    state = {
      periods: state.periods.map((p) =>
        p.id === id ? { ...p, ...payload } : p
      ),
    };
    emit();
  },

  updateDocument: (periodId: string, docType: DocType, received: boolean, receivedDate?: string) => {
    state = {
      periods: state.periods.map((p) => {
        if (p.id !== periodId) return p;
        return {
          ...p,
          documents: p.documents.map((d) =>
            d.type === docType ? { ...d, received, receivedDate: received ? receivedDate : undefined } : d
          ),
        };
      }),
    };
    emit();
  },

  updateCompensation: (periodId: string, update: Partial<ReserveCompensation>) => {
    state = {
      periods: state.periods.map((p) =>
        p.id === periodId
          ? { ...p, compensation: { ...p.compensation, ...update } }
          : p
      ),
    };
    emit();
  },

  updateNotes: (periodId: string, notes: string) => {
    state = {
      periods: state.periods.map((p) =>
        p.id === periodId ? { ...p, notes } : p
      ),
    };
    emit();
  },

  deletePeriod: (id: string) => {
    state = { periods: state.periods.filter((p) => p.id !== id) };
    emit();
  },
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

let cachedSnapshot: ReserveStoreData | null = null;

function getSnapshot(): ReserveStoreData {
  if (cachedSnapshot === null) {
    cachedSnapshot = state;
  }
  return cachedSnapshot;
}

export function useReserve(): ReserveStoreData {
  return useSyncExternalStore(reserveStore.subscribe, getSnapshot, getSnapshot);
}
