import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState, useMemo, type ReactNode } from "react";
import { FileText, Plus, Trash2, Pencil, CheckCircle2, Circle, Upload, Link2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import {
  useDocuments,
  documentsStore,
  DOC_TYPE_LABELS,
  DOC_DIRECTION_LABELS,
  currentIsoMonth,
  isoMonth,
  type DocumentType,
  type DocumentDirection,
  type BusinessDocument,
} from "@/lib/documents-store";
import { useFinance, fmt, fmtDate } from "@/lib/finance-store";

export const Route = createFileRoute("/documents")({
  head: () => ({ meta: [{ title: "מסמכים — Cashflow OS" }] }),
  component: DocumentsScreen,
});

const DOC_TYPES: DocumentType[] = ["receipt", "invoice", "credit_note", "other"];
const DIRECTIONS: DocumentDirection[] = ["expense", "income"];

type Filter = "all" | "expense" | "income" | "not_sent" | "this_month";

const FILTER_LABELS: Record<Filter, string> = {
  all: "הכל",
  expense: "הוצאות",
  income: "הכנסות",
  not_sent: "לא הועבר לרו״ח",
  this_month: "החודש",
};

const FILTERS: Filter[] = ["all", "expense", "income", "not_sent", "this_month"];

type FormMode = "closed" | "add" | string;
type LinkType = "none" | "expense" | "income";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function DocumentsScreen() {
  const { documents } = useDocuments();
  const { transactions } = useFinance();
  const [filter, setFilter] = useState<Filter>("all");
  const [formMode, setFormMode] = useState<FormMode>("closed");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [fileName, setFileName] = useState("");
  const [fileUri, setFileUri] = useState("");
  const [fileType, setFileType] = useState<string | null>(null);
  const [documentType, setDocumentType] = useState<DocumentType>("invoice");
  const [direction, setDirection] = useState<DocumentDirection>("expense");
  const [documentDate, setDocumentDate] = useState(today());
  const [amount, setAmount] = useState("");
  const [supplierCustomerName, setSupplierCustomerName] = useState("");
  const [notes, setNotes] = useState("");
  const [linkType, setLinkType] = useState<LinkType>("none");
  const [selectedTransactionId, setSelectedTransactionId] = useState("");

  const thisMonth = currentIsoMonth();

  const filtered = documents.filter((d) => {
    if (filter === "expense") return d.direction === "expense";
    if (filter === "income") return d.direction === "income";
    if (filter === "not_sent") return !d.sentToAccountant;
    if (filter === "this_month") return isoMonth(d.uploadedAt) === thisMonth;
    return true;
  });

  const notSentCount = documents.filter((d) => !d.sentToAccountant).length;
  const thisMonthCount = documents.filter((d) => isoMonth(d.uploadedAt) === thisMonth).length;

  // Transactions available for linking, keyed for quick lookup
  const txById = useMemo(() => new Map(transactions.map((t) => [t.id, t])), [transactions]);
  const expenseTxs = useMemo(
    () => transactions.filter((t) => t.type === "expense"),
    [transactions],
  );
  const incomeTxs = useMemo(() => transactions.filter((t) => t.type === "income"), [transactions]);

  const resetForm = () => {
    setFileName("");
    setFileUri("");
    setFileType(null);
    setDocumentType("invoice");
    setDirection("expense");
    setDocumentDate(today());
    setAmount("");
    setSupplierCustomerName("");
    setNotes("");
    setLinkType("none");
    setSelectedTransactionId("");
  };

  const openAdd = () => {
    resetForm();
    setFormMode("add");
  };

  const openEdit = (doc: BusinessDocument) => {
    setFileName(doc.fileName);
    setFileUri(doc.fileUri);
    setFileType(doc.fileType);
    setDocumentType(doc.documentType);
    setDirection(doc.direction);
    setDocumentDate(doc.documentDate ?? today());
    setAmount(doc.amount !== null ? String(doc.amount) : "");
    setSupplierCustomerName(doc.supplierCustomerName ?? "");
    setNotes(doc.notes ?? "");
    if (doc.expenseId) {
      setLinkType("expense");
      setSelectedTransactionId(doc.expenseId);
    } else if (doc.incomeId) {
      setLinkType("income");
      setSelectedTransactionId(doc.incomeId);
    } else {
      setLinkType("none");
      setSelectedTransactionId("");
    }
    setFormMode(doc.id);
  };

  const closeForm = () => {
    setFormMode("closed");
    resetForm();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setFileType(file.type || null);
    if (file.size <= 512 * 1024) {
      const reader = new FileReader();
      reader.onload = (ev) => setFileUri((ev.target?.result as string) ?? "");
      reader.readAsDataURL(file);
    } else {
      setFileUri("");
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleLinkTypeChange = (lt: LinkType) => {
    setLinkType(lt);
    setSelectedTransactionId("");
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileName || !documentType || !direction) return;
    const now = new Date().toISOString();
    const existing = formMode !== "add" ? documents.find((d) => d.id === formMode) : null;
    const payload = {
      fileName,
      fileUri,
      fileType,
      documentType,
      direction,
      uploadedAt: existing?.uploadedAt ?? now,
      documentDate: documentDate || null,
      amount: amount !== "" ? Number(amount) : null,
      supplierCustomerName: supplierCustomerName || null,
      expenseId: linkType === "expense" && selectedTransactionId ? selectedTransactionId : null,
      incomeId: linkType === "income" && selectedTransactionId ? selectedTransactionId : null,
      sentToAccountant: existing?.sentToAccountant ?? false,
      notes: notes || null,
    };
    if (formMode === "add") {
      documentsStore.addDocument(payload);
    } else {
      documentsStore.updateDocument(formMode, payload);
    }
    closeForm();
  };

  const handleDelete = (id: string) => {
    if (window.confirm("למחוק את המסמך?")) {
      documentsStore.deleteDocument(id);
    }
  };

  return (
    <AppShell title="מסמכים" subtitle="ניהול מסמכים עסקיים">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx"
        onChange={handleFileChange}
      />

      {/* Summary card */}
      {documents.length > 0 && formMode === "closed" && (
        <div className="mb-4 rounded-3xl border border-border bg-surface p-5">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            סיכום מסמכים
          </p>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center">
              <p className="font-display text-xl font-bold tabular">{documents.length}</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">סה״כ</p>
            </div>
            <div className="text-center">
              <p
                className={`font-display text-xl font-bold tabular ${notSentCount > 0 ? "text-warning" : ""}`}
              >
                {notSentCount}
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">לא הועבר לרו״ח</p>
            </div>
            <div className="text-center">
              <p className="font-display text-xl font-bold tabular">{thisMonthCount}</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">החודש</p>
            </div>
          </div>
        </div>
      )}

      {/* Add button */}
      {formMode === "closed" && (
        <button
          onClick={openAdd}
          className="mb-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-primary/40 bg-primary/5 py-3 text-sm font-semibold text-primary transition active:scale-[0.98]"
        >
          <Plus className="h-4 w-4" />
          הוסף מסמך
        </button>
      )}

      {/* Inline form */}
      {formMode !== "closed" && (
        <form
          onSubmit={submit}
          className="mb-5 space-y-4 rounded-3xl border border-border bg-surface p-5"
        >
          <h3 className="font-display text-base font-semibold">
            {formMode === "add" ? "מסמך חדש" : "עריכת מסמך"}
          </h3>

          {/* File picker */}
          <Field label="קובץ">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 rounded-xl border border-border bg-surface-elevated px-3 py-2 text-sm font-medium text-muted-foreground transition hover:border-primary hover:text-primary active:scale-[0.98]"
              >
                <Upload className="h-4 w-4" />
                בחר קובץ
              </button>
              {fileName && (
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{fileName}</span>
              )}
            </div>
            {!fileName && (
              <>
                <p className="mt-1.5 text-xs text-muted-foreground/60">
                  ניתן גם להזין שם קובץ ידנית
                </p>
                <input
                  value={fileName}
                  onChange={(e) => setFileName(e.target.value)}
                  placeholder="שם הקובץ"
                  className="mt-2 w-full bg-transparent text-sm font-medium outline-none placeholder:text-muted-foreground/50"
                />
              </>
            )}
          </Field>

          {/* Document type */}
          <Field label="סוג מסמך">
            <div className="flex flex-wrap gap-2">
              {DOC_TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setDocumentType(t)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                    documentType === t
                      ? "border-primary bg-primary/15 text-primary"
                      : "border-border bg-surface text-muted-foreground"
                  }`}
                >
                  {DOC_TYPE_LABELS[t]}
                </button>
              ))}
            </div>
          </Field>

          {/* Direction */}
          <Field label="כיוון">
            <div className="flex gap-2">
              {DIRECTIONS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDirection(d)}
                  className={`flex-1 rounded-xl border py-2 text-xs font-semibold transition ${
                    direction === d
                      ? d === "expense"
                        ? "border-destructive/40 bg-destructive/10 text-destructive"
                        : "border-success/40 bg-success/10 text-success"
                      : "border-border bg-surface-elevated text-muted-foreground"
                  }`}
                >
                  {DOC_DIRECTION_LABELS[d]}
                </button>
              ))}
            </div>
          </Field>

          {/* Transaction link */}
          <Field label="שיוך לתנועה">
            <div className="flex gap-2">
              {(["none", "expense", "income"] as LinkType[]).map((lt) => (
                <button
                  key={lt}
                  type="button"
                  onClick={() => handleLinkTypeChange(lt)}
                  className={`flex-1 rounded-xl border py-1.5 text-xs font-semibold transition ${
                    linkType === lt
                      ? "border-primary bg-primary/15 text-primary"
                      : "border-border bg-surface-elevated text-muted-foreground"
                  }`}
                >
                  {lt === "none" ? "ללא שיוך" : lt === "expense" ? "הוצאה" : "הכנסה"}
                </button>
              ))}
            </div>
            {linkType !== "none" && (
              <select
                value={selectedTransactionId}
                onChange={(e) => setSelectedTransactionId(e.target.value)}
                className="mt-2.5 w-full rounded-xl border border-border bg-surface-elevated px-3 py-2 text-sm font-medium outline-none"
              >
                <option value="">בחר תנועה...</option>
                {(linkType === "expense" ? expenseTxs : incomeTxs).map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.party} — {fmt(t.amount)} — {fmtDate(t.date)}
                  </option>
                ))}
              </select>
            )}
          </Field>

          {/* Amount */}
          <Field label="סכום (אופציונלי)">
            <div className="flex items-baseline gap-1">
              <input
                inputMode="decimal"
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
                className="w-full bg-transparent font-display text-xl font-bold tabular outline-none placeholder:text-muted-foreground/40"
              />
              <span className="font-display text-base text-muted-foreground">₪</span>
            </div>
          </Field>

          {/* Supplier / customer */}
          <Field label="ספק / לקוח (אופציונלי)">
            <input
              value={supplierCustomerName}
              onChange={(e) => setSupplierCustomerName(e.target.value)}
              placeholder="לדוגמה: בזק"
              className="w-full bg-transparent text-base font-medium outline-none placeholder:text-muted-foreground/60"
            />
          </Field>

          {/* Date */}
          <Field label="תאריך מסמך (אופציונלי)">
            <input
              type="date"
              value={documentDate}
              onChange={(e) => setDocumentDate(e.target.value)}
              className="w-full bg-transparent text-base font-medium outline-none [color-scheme:dark]"
            />
          </Field>

          {/* Notes */}
          <Field label="הערות (אופציונלי)">
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="הערה חופשית"
              className="w-full bg-transparent text-sm font-medium outline-none placeholder:text-muted-foreground/60"
            />
          </Field>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={closeForm}
              className="flex-1 rounded-xl border border-border py-2.5 text-sm font-semibold text-muted-foreground transition active:scale-[0.98]"
            >
              ביטול
            </button>
            <button
              type="submit"
              disabled={!fileName}
              className="flex-1 rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition active:scale-[0.98] disabled:opacity-40"
            >
              שמור
            </button>
          </div>
        </form>
      )}

      {/* Filters */}
      {documents.length > 0 && formMode === "closed" && (
        <div className="mb-3 flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                filter === f
                  ? "border-primary bg-primary/15 text-primary"
                  : "border-border bg-surface-elevated text-muted-foreground"
              }`}
            >
              {FILTER_LABELS[f]}
            </button>
          ))}
        </div>
      )}

      {/* Empty state */}
      {documents.length === 0 && formMode === "closed" && (
        <div className="rounded-2xl border border-border bg-surface p-8 text-center">
          <FileText className="mx-auto h-8 w-8 text-muted-foreground/40" />
          <p className="mt-3 text-sm font-semibold">אין עדיין מסמכים</p>
          <p className="mt-1 text-xs text-muted-foreground/60">
            העלה קבלות וחשבוניות כדי לעקוב אחרי מסמכים עסקיים
          </p>
          <button
            onClick={openAdd}
            className="mt-4 rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition active:scale-[0.98]"
          >
            העלה מסמך ראשון
          </button>
        </div>
      )}

      {/* Empty filtered state */}
      {documents.length > 0 && filtered.length === 0 && formMode === "closed" && (
        <div className="rounded-2xl border border-border bg-surface p-6 text-center">
          <p className="text-sm text-muted-foreground">אין מסמכים בסינון זה</p>
        </div>
      )}

      {/* Document list */}
      {filtered.length > 0 && formMode === "closed" && (
        <ul className="space-y-2">
          {filtered.map((doc) => {
            const linkedTx = doc.expenseId
              ? txById.get(doc.expenseId)
              : doc.incomeId
                ? txById.get(doc.incomeId)
                : null;
            return (
              <li key={doc.id} className="rounded-2xl border border-border bg-surface p-4">
                {/* Top row */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                      <FileText className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            doc.direction === "expense"
                              ? "bg-destructive/10 text-destructive"
                              : "bg-success/10 text-success"
                          }`}
                        >
                          {DOC_TYPE_LABELS[doc.documentType]} ·{" "}
                          {DOC_DIRECTION_LABELS[doc.direction]}
                        </span>
                      </div>
                      <p className="mt-0.5 truncate text-sm font-semibold">{doc.fileName}</p>
                    </div>
                  </div>
                  {doc.amount !== null && (
                    <p className="shrink-0 font-display text-sm font-bold tabular">
                      {fmt(doc.amount)}
                    </p>
                  )}
                </div>

                {/* Meta row */}
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  {doc.supplierCustomerName && <span>{doc.supplierCustomerName}</span>}
                  <span>הועלה: {fmtDate(doc.uploadedAt.slice(0, 10))}</span>
                  {doc.documentDate && <span>מסמך: {fmtDate(doc.documentDate)}</span>}
                  {linkedTx && (
                    <span className="flex items-center gap-0.5 text-primary/70">
                      <Link2 className="h-3 w-3" />
                      {linkedTx.party}
                    </span>
                  )}
                </div>

                {/* Bottom row */}
                <div className="mt-3 flex items-center justify-between">
                  <button
                    onClick={() => documentsStore.toggleSentToAccountant(doc.id)}
                    className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition active:scale-[0.98] ${
                      doc.sentToAccountant
                        ? "border-success/30 bg-success/10 text-success hover:bg-success/20"
                        : "border-border bg-surface-elevated text-muted-foreground hover:border-success hover:text-success"
                    }`}
                  >
                    {doc.sentToAccountant ? (
                      <CheckCircle2 className="h-3 w-3" />
                    ) : (
                      <Circle className="h-3 w-3" />
                    )}
                    {doc.sentToAccountant ? "הועבר לרו״ח" : "לא הועבר לרו״ח"}
                  </button>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEdit(doc)}
                      className="flex items-center gap-1 rounded-full border border-border bg-surface-elevated px-2 py-0.5 text-[10px] font-medium text-muted-foreground transition hover:border-primary hover:text-primary"
                    >
                      <Pencil className="h-2.5 w-2.5" />
                      ערוך
                    </button>
                    <button
                      onClick={() => handleDelete(doc.id)}
                      className="flex items-center gap-1 rounded-full border border-border bg-surface-elevated px-2 py-0.5 text-[10px] font-medium text-muted-foreground transition hover:border-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-2.5 w-2.5" />
                      מחק
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </AppShell>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block rounded-2xl border border-border bg-surface-elevated px-4 py-3">
      <span className="block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}
