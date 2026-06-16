import { createFileRoute, Link } from "@tanstack/react-router";
import { Shield, Plus, ChevronRight, ChevronLeft, CheckCircle2, Circle, FileText, Banknote, StickyNote, Trash2, CalendarIcon } from "lucide-react";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  useReserve,
  reserveStore,
  DOC_LABELS,
  COMPENSATION_STATUS_LABELS,
  type DocType,
  type CompensationStatus,
  type AddPeriodPayload,
  type ReservePeriod,
} from "@/lib/reserve-store";
import { fmtDate, fmt, localISO } from "@/lib/finance-store";

export const Route = createFileRoute("/reserve")({
  head: () => ({
    meta: [{ title: "מילואים | Cashflow OS" }],
  }),
  component: ReservePage,
});

// ─── Main page ────────────────────────────────────────────────────────────────

function ReservePage() {
  const { periods } = useReserve();
  const [showForm, setShowForm] = useState(false);

  return (
    <AppShell
      header={
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="grid h-9 w-9 place-items-center rounded-full border border-border bg-surface text-muted-foreground"
          >
            <ChevronRight className="h-4 w-4" />
          </Link>
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              מעקב
            </p>
            <h1 className="mt-0.5 font-display text-2xl font-semibold">מילואים</h1>
          </div>
        </div>
      }
    >
      {showForm && (
        <AddPeriodForm onClose={() => setShowForm(false)} />
      )}

      {!showForm && periods.length === 0 && (
        <EmptyState onAdd={() => setShowForm(true)} />
      )}

      {!showForm && periods.length > 0 && (
        <div className="space-y-4">
          <CompensationSummaryCard periods={periods} />
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{periods.length} תקופות שירות</p>
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary transition active:scale-95"
            >
              <Plus className="h-3.5 w-3.5" />
              הוסף תקופה
            </button>
          </div>
          {periods.map((period) => (
            <PeriodCard key={period.id} periodId={period.id} />
          ))}
        </div>
      )}
    </AppShell>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-primary/10 text-primary">
        <Shield className="h-8 w-8" />
      </div>
      <h2 className="font-display text-lg font-semibold">לא הוגדרו נתוני מילואים</h2>
      <p className="mt-1.5 max-w-[240px] text-sm text-muted-foreground">
        נהל תקופות שירות מילואים, מסמכים ותשלומים צפויים במקום אחד.
      </p>
      <button
        onClick={onAdd}
        className="mt-6 flex items-center gap-2 rounded-2xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow transition active:scale-[0.98]"
      >
        <Plus className="h-4 w-4" />
        צור תקופת שירות
      </button>
    </div>
  );
}

// ─── Compensation summary card ─────────────────────────────────────────────────

function CompensationSummaryCard({ periods }: { periods: ReservePeriod[] }) {
  const totalAmount = periods.reduce((sum, p) => sum + p.compensation.estimatedAmount, 0);

  const statusPriority: Record<CompensationStatus, number> = {
    paid: 0,
    approved: 1,
    submitted: 2,
    pending: 3,
  };
  const dominantStatus = periods.reduce<CompensationStatus>((worst, p) => {
    return statusPriority[p.compensation.status] > statusPriority[worst]
      ? p.compensation.status
      : worst;
  }, "paid");

  const statusColors: Record<CompensationStatus, string> = {
    pending: "bg-muted/60 text-muted-foreground",
    submitted: "bg-warning/15 text-warning",
    approved: "bg-primary/15 text-primary",
    paid: "bg-success/15 text-success",
  };

  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        סיכום פיצויים
      </p>
      {totalAmount > 0 ? (
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">פיצוי צפוי</p>
            <p className="mt-0.5 font-display text-2xl font-bold tabular">{fmt(totalAmount)}</p>
          </div>
          <div className="text-end">
            <p className="text-xs text-muted-foreground">סטטוס</p>
            <span className={`mt-1 inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusColors[dominantStatus]}`}>
              {COMPENSATION_STATUS_LABELS[dominantStatus]}
            </span>
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">לא הוגדר פיצוי צפוי</p>
      )}
    </div>
  );
}

// ─── Period card ──────────────────────────────────────────────────────────────

function PeriodCard({ periodId }: { periodId: string }) {
  const { periods } = useReserve();
  const period = periods.find((p) => p.id === periodId);
  const [expanded, setExpanded] = useState(true);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesDraft, setNotesDraft] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!period) return null;

  const docsReceived = period.documents.filter((d) => d.received).length;
  const docsMissing = period.documents.length - docsReceived;

  return (
    <div className="rounded-2xl border border-border bg-surface overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between p-4 text-start"
      >
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
            <Shield className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-semibold">
              {fmtDate(period.startDate)} – {fmtDate(period.endDate)}
            </p>
            <p className="text-xs text-muted-foreground">{period.days} ימי שירות</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {docsMissing > 0 && (
            <span className="rounded-full bg-warning/15 px-2 py-0.5 text-[10px] font-semibold text-warning">
              {docsMissing} מסמכים חסרים
            </span>
          )}
          <ChevronLeft
            className={`h-4 w-4 text-muted-foreground/50 transition-transform ${expanded ? "-rotate-90" : "rotate-90"}`}
          />
        </div>
      </button>

      {expanded && (
        <div className="border-t border-border/60 px-4 pb-4 pt-3 space-y-4">
          {/* Documents */}
          <div>
            <div className="mb-2 flex items-center gap-2">
              <FileText className="h-3.5 w-3.5 text-muted-foreground" />
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                מסמכים
              </p>
            </div>
            <div className="space-y-2">
              {period.documents.map((doc) => (
                <DocumentRow
                  key={doc.type}
                  periodId={period.id}
                  doc={doc}
                />
              ))}
            </div>
          </div>

          {/* Compensation */}
          <div className="rounded-xl border border-border/60 bg-background/40 p-3">
            <div className="mb-2 flex items-center gap-2">
              <Banknote className="h-3.5 w-3.5 text-muted-foreground" />
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                פיצויים
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">סכום משוער</p>
                <p className="text-sm font-semibold tabular">
                  {period.compensation.estimatedAmount > 0
                    ? fmt(period.compensation.estimatedAmount)
                    : "—"}
                </p>
              </div>
              {period.compensation.expectedPaymentDate && (
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">תאריך תשלום צפוי</p>
                  <p className="text-xs tabular">{fmtDate(period.compensation.expectedPaymentDate)}</p>
                </div>
              )}
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">סטטוס</p>
                <CompensationStatusSelect
                  value={period.compensation.status}
                  onChange={(s) => reserveStore.updateCompensation(period.id, { status: s })}
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <div className="mb-2 flex items-center gap-2">
              <StickyNote className="h-3.5 w-3.5 text-muted-foreground" />
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                הערות
              </p>
            </div>
            {editingNotes ? (
              <div>
                <textarea
                  value={notesDraft}
                  onChange={(e) => setNotesDraft(e.target.value)}
                  rows={3}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary/60"
                  placeholder="הערות חופשיות..."
                  autoFocus
                />
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={() => setEditingNotes(false)}
                    className="flex-1 rounded-xl border border-border py-1.5 text-xs font-semibold"
                  >
                    ביטול
                  </button>
                  <button
                    onClick={() => {
                      reserveStore.updateNotes(period.id, notesDraft);
                      setEditingNotes(false);
                    }}
                    className="flex-1 rounded-xl bg-primary py-1.5 text-xs font-semibold text-primary-foreground"
                  >
                    שמור
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => {
                  setNotesDraft(period.notes);
                  setEditingNotes(true);
                }}
                className="w-full rounded-xl border border-dashed border-border bg-background/40 px-3 py-2 text-start text-sm text-muted-foreground transition hover:border-primary/40"
              >
                {period.notes || "הוסף הערה..."}
              </button>
            )}
          </div>

          {/* Delete */}
          {confirmDelete ? (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3">
              <p className="mb-2 text-xs font-semibold text-destructive">מחיקת תקופת שירות?</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="flex-1 rounded-xl border border-border py-1.5 text-xs font-semibold"
                >
                  ביטול
                </button>
                <button
                  onClick={() => reserveStore.deletePeriod(period.id)}
                  className="flex-1 rounded-xl bg-destructive py-1.5 text-xs font-semibold text-destructive-foreground"
                >
                  מחק
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="flex items-center gap-1.5 text-xs text-destructive/70 transition hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
              מחק תקופה
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Document row ─────────────────────────────────────────────────────────────

function DocumentRow({
  periodId,
  doc,
}: {
  periodId: string;
  doc: { type: DocType; received: boolean; receivedDate?: string };
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <button
        onClick={() =>
          reserveStore.updateDocument(
            periodId,
            doc.type,
            !doc.received,
            !doc.received ? new Date().toISOString().slice(0, 10) : undefined
          )
        }
        className="flex items-center gap-2 text-start"
      >
        {doc.received ? (
          <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
        ) : (
          <Circle className="h-4 w-4 shrink-0 text-muted-foreground/40" />
        )}
        <span className={`text-sm ${doc.received ? "text-foreground" : "text-muted-foreground"}`}>
          {DOC_LABELS[doc.type]}
        </span>
      </button>
      {doc.received && doc.receivedDate && (
        <span className="text-[10px] text-muted-foreground">{fmtDate(doc.receivedDate)}</span>
      )}
    </div>
  );
}

// ─── Compensation status selector ─────────────────────────────────────────────

function CompensationStatusSelect({
  value,
  onChange,
}: {
  value: CompensationStatus;
  onChange: (s: CompensationStatus) => void;
}) {
  const statuses: CompensationStatus[] = ["pending", "submitted", "approved", "paid"];
  const colors: Record<CompensationStatus, string> = {
    pending: "bg-muted text-muted-foreground",
    submitted: "bg-warning/15 text-warning",
    approved: "bg-primary/15 text-primary",
    paid: "bg-success/15 text-success",
  };
  return (
    <div className="flex gap-1">
      {statuses.map((s) => (
        <button
          key={s}
          onClick={() => onChange(s)}
          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold transition ${
            value === s ? colors[s] : "text-muted-foreground/40 hover:text-muted-foreground"
          }`}
        >
          {COMPENSATION_STATUS_LABELS[s]}
        </button>
      ))}
    </div>
  );
}

// ─── Date picker field ────────────────────────────────────────────────────────

function DatePickerField({
  label,
  value,
  onChange,
  placeholder = "בחר תאריך",
}: {
  label: string;
  value: string;
  onChange: (iso: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  // Parse ISO string as local date to avoid UTC offset shifting the day
  const selected = value
    ? (() => {
        const [y, m, d] = value.split("-").map(Number);
        return new Date(y, m - 1, d);
      })()
    : undefined;

  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-muted-foreground">{label}</label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-sm transition hover:border-primary/60 focus:outline-none focus:border-primary/60"
          >
            <CalendarIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className={value ? "text-foreground" : "text-muted-foreground/60"}>
              {value ? fmtDate(value) : placeholder}
            </span>
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={selected}
            onSelect={(date) => {
              if (date) {
                onChange(localISO(date));
                setOpen(false);
              }
            }}
            autoFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

// ─── Add period form ──────────────────────────────────────────────────────────

function AddPeriodForm({ onClose }: { onClose: () => void }) {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [estimatedAmount, setEstimatedAmount] = useState("");
  const [expectedPaymentDate, setExpectedPaymentDate] = useState("");
  const [notes, setNotes] = useState("");

  const days =
    startDate && endDate
      ? Math.max(
          0,
          Math.round(
            (new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000
          ) + 1
        )
      : 0;

  const canSubmit = startDate && endDate && endDate >= startDate;

  const handleSubmit = () => {
    if (!canSubmit) return;
    const payload: AddPeriodPayload = {
      startDate,
      endDate,
      days,
      estimatedAmount: Number(estimatedAmount) || 0,
      expectedPaymentDate: expectedPaymentDate || undefined,
      notes,
    };
    reserveStore.addPeriod(payload);
    onClose();
  };

  return (
    <div className="mb-5 rounded-2xl border border-border bg-surface p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-base font-semibold">תקופת שירות חדשה</h2>
        <button onClick={onClose} className="text-xs text-muted-foreground">
          ביטול
        </button>
      </div>

      {/* Date range */}
      <div className="grid grid-cols-2 gap-3">
        <DatePickerField
          label="תחילת שירות"
          value={startDate}
          onChange={setStartDate}
        />
        <DatePickerField
          label="סיום שירות"
          value={endDate}
          onChange={setEndDate}
        />
      </div>

      {days > 0 && (
        <p className="text-xs text-primary font-medium">{days} ימי שירות</p>
      )}

      {/* Compensation */}
      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">פיצוי משוער (₪)</label>
        <input
          type="text"
          inputMode="numeric"
          value={estimatedAmount}
          onChange={(e) => setEstimatedAmount(e.target.value.replace(/[^0-9]/g, ""))}
          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary/60"
          placeholder="0"
        />
      </div>

      <DatePickerField
        label="תאריך תשלום צפוי"
        value={expectedPaymentDate}
        onChange={setExpectedPaymentDate}
        placeholder="בחר תאריך (אופציונלי)"
      />

      {/* Notes */}
      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">הערות</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary/60"
          placeholder="לדוגמה: ממתין לאישור מהצבא..."
        />
      </div>

      <button
        onClick={handleSubmit}
        disabled={!canSubmit}
        className="w-full rounded-2xl bg-primary py-3 text-sm font-semibold text-primary-foreground shadow transition active:scale-[0.98] disabled:opacity-40"
      >
        שמור תקופה
      </button>
    </div>
  );
}
