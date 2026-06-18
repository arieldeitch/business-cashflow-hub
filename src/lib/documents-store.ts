import { useSyncExternalStore } from "react";

export type DocumentType = "receipt" | "invoice" | "credit_note" | "other";
export type DocumentDirection = "expense" | "income";

export interface BusinessDocument {
  id: string;
  fileUri: string;
  fileName: string;
  fileType: string | null;
  documentType: DocumentType;
  direction: DocumentDirection;
  uploadedAt: string;
  documentDate: string | null;
  amount: number | null;
  supplierCustomerName: string | null;
  expenseId: string | null;
  incomeId: string | null;
  sentToAccountant: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export type AddDocumentPayload = Omit<BusinessDocument, "id" | "createdAt" | "updatedAt">;
export type UpdateDocumentPayload = Partial<Omit<BusinessDocument, "id" | "createdAt">>;

// ─── Persistence ────────────────────────────────────────────────────────────

const STORAGE_KEY = "cashflow_documents_v1";

type DocsState = { documents: BusinessDocument[] };

function loadDocs(): DocsState {
  try {
    if (typeof localStorage === "undefined") return { documents: [] };
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { documents: [] };
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === "object" && Array.isArray((parsed as DocsState).documents)) {
      return {
        documents: ((parsed as DocsState).documents as unknown[]).map((d) => ({
          expenseId: null,
          incomeId: null,
          ...(d as object),
        })) as BusinessDocument[],
      };
    }
  } catch {
    // ignore
  }
  return { documents: [] };
}

function saveDocs(s: DocsState): void {
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    // Storage full or unavailable
  }
}

// ─── Store ───────────────────────────────────────────────────────────────────

let docsState: DocsState = loadDocs();
const docsListeners = new Set<() => void>();
let cachedDocsSnapshot: DocsState | null = null;

const emitDocs = () => {
  cachedDocsSnapshot = null;
  saveDocs(docsState);
  docsListeners.forEach((l) => l());
};

export const documentsStore = {
  get: () => docsState,
  subscribe: (l: () => void) => {
    docsListeners.add(l);
    return () => docsListeners.delete(l);
  },

  addDocument: (payload: AddDocumentPayload) => {
    const now = new Date().toISOString();
    const doc: BusinessDocument = {
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
      ...payload,
    };
    docsState = { documents: [doc, ...docsState.documents] };
    emitDocs();
  },

  updateDocument: (id: string, payload: UpdateDocumentPayload) => {
    docsState = {
      documents: docsState.documents.map((d) =>
        d.id === id ? { ...d, ...payload, updatedAt: new Date().toISOString() } : d,
      ),
    };
    emitDocs();
  },

  toggleSentToAccountant: (id: string) => {
    docsState = {
      documents: docsState.documents.map((d) =>
        d.id === id
          ? { ...d, sentToAccountant: !d.sentToAccountant, updatedAt: new Date().toISOString() }
          : d,
      ),
    };
    emitDocs();
  },

  deleteDocument: (id: string) => {
    docsState = { documents: docsState.documents.filter((d) => d.id !== id) };
    emitDocs();
  },
};

function getDocsSnapshot(): DocsState {
  if (cachedDocsSnapshot === null) {
    cachedDocsSnapshot = docsState;
  }
  return cachedDocsSnapshot;
}

export function useDocuments(): DocsState {
  return useSyncExternalStore(documentsStore.subscribe, getDocsSnapshot, getDocsSnapshot);
}

// ─── Labels ──────────────────────────────────────────────────────────────────

export const DOC_TYPE_LABELS: Record<DocumentType, string> = {
  receipt: "קבלה",
  invoice: "חשבונית",
  credit_note: "חשבונית זיכוי",
  other: "אחר",
};

export const DOC_DIRECTION_LABELS: Record<DocumentDirection, string> = {
  expense: "הוצאה",
  income: "הכנסה",
};

/** ISO yyyy-mm of a given date string (or today). */
export function isoMonth(isoDate: string): string {
  return isoDate.slice(0, 7);
}

export function currentIsoMonth(): string {
  return new Date().toISOString().slice(0, 7);
}
