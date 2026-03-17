"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ProviderVisitNoteRecord } from "@/lib/carebridge/types";

type ProviderVisitNoteEditorProps = {
  appointmentId: string;
  patientId: string;
  visitId?: string | null;
  initialNote: ProviderVisitNoteRecord | null;
  compact?: boolean;
};

type StructuredValue = {
  reason_for_visit: string;
  symptoms_discussed: string;
  observations: string;
  follow_up_plan: string;
};

function getStructuredValues(note: ProviderVisitNoteRecord | null): StructuredValue {
  const source = note?.structured_notes ?? {};
  return {
    reason_for_visit: typeof source.reason_for_visit === "string" ? source.reason_for_visit : "",
    symptoms_discussed: typeof source.symptoms_discussed === "string" ? source.symptoms_discussed : "",
    observations: typeof source.observations === "string" ? source.observations : "",
    follow_up_plan: typeof source.follow_up_plan === "string" ? source.follow_up_plan : "",
  };
}

export default function ProviderVisitNoteEditor({
  appointmentId,
  patientId,
  visitId = null,
  initialNote,
  compact = false,
}: ProviderVisitNoteEditorProps) {
  const router = useRouter();
  const [subject, setSubject] = useState(initialNote?.subject ?? "");
  const [noteBody, setNoteBody] = useState(initialNote?.note_body ?? "");
  const [structured, setStructured] = useState<StructuredValue>(() => getStructuredValues(initialNote));
  const [status, setStatus] = useState(initialNote?.status ?? "draft");
  const [savingState, setSavingState] = useState<"draft" | "finalized" | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const updatedLabel = useMemo(() => {
    if (!initialNote?.updated_at) return "Not saved yet";
    return `Last updated ${new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(initialNote.updated_at))}`;
  }, [initialNote?.updated_at]);

  async function save(nextStatus: "draft" | "finalized") {
    setSavingState(nextStatus);
    setMessage(null);

    const response = await fetch("/api/provider-notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        appointmentId,
        patientId,
        visitId,
        status: nextStatus,
        subject,
        noteBody,
        structuredNotes: structured,
      }),
    });

    const payload = (await response.json().catch(() => ({}))) as { error?: string; note?: ProviderVisitNoteRecord };
    setSavingState(null);

    if (!response.ok) {
      setMessage(payload.error ?? "Could not save visit note.");
      return;
    }

    setStatus(payload.note?.status ?? nextStatus);
    setMessage(nextStatus === "finalized" ? "Visit note finalized." : "Draft saved.");
    router.refresh();
  }

  return (
    <section className="panel px-5 py-5">
      <div className={`flex ${compact ? "flex-col" : "flex-col sm:flex-row sm:items-start sm:justify-between"} gap-3`}>
        <div>
          <div className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)]">Private visit notes</div>
          <div className="mt-2 text-xl font-semibold">{initialNote ? "Continue your note" : "Start a draft note"}</div>
          <div className="mt-2 text-sm leading-6 muted">
            Provider-only notes for discussion points, observations, and follow-up planning.
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-full border border-[var(--border)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em]">
            {status}
          </span>
          <span className="text-xs muted">{updatedLabel}</span>
        </div>
      </div>

      <div className="mt-5 grid gap-4">
        <label className="text-sm">
          <div className="mb-2 font-medium">Subject</div>
          <input className="field" value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="Follow-up on gut symptoms" />
        </label>

        <label className="text-sm">
          <div className="mb-2 font-medium">Visit note</div>
          <textarea
            className={`field ${compact ? "min-h-[180px]" : "min-h-[220px]"}`}
            value={noteBody}
            onChange={(event) => setNoteBody(event.target.value)}
            placeholder="Document the key parts of the visit, assessment, and next steps."
          />
        </label>

        <div className="grid gap-4 md:grid-cols-2">
          <StructuredField
            label="Reason for visit"
            value={structured.reason_for_visit}
            onChange={(value) => setStructured((current) => ({ ...current, reason_for_visit: value }))}
          />
          <StructuredField
            label="Symptoms discussed"
            value={structured.symptoms_discussed}
            onChange={(value) => setStructured((current) => ({ ...current, symptoms_discussed: value }))}
          />
          <StructuredField
            label="Observations"
            value={structured.observations}
            onChange={(value) => setStructured((current) => ({ ...current, observations: value }))}
          />
          <StructuredField
            label="Follow-up plan"
            value={structured.follow_up_plan}
            onChange={(value) => setStructured((current) => ({ ...current, follow_up_plan: value }))}
          />
        </div>
      </div>

      {message ? <div className="mt-4 rounded-2xl border border-[var(--border)] bg-white/70 p-3 text-sm">{message}</div> : null}

      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="button"
          className="btn-secondary px-4 py-2 text-sm"
          disabled={savingState !== null}
          onClick={() => save("draft")}
        >
          {savingState === "draft" ? "Saving draft..." : "Save draft"}
        </button>
        <button
          type="button"
          className="btn-primary px-4 py-2 text-sm"
          disabled={savingState !== null}
          onClick={() => save("finalized")}
        >
          {savingState === "finalized" ? "Finalizing..." : status === "finalized" ? "Update finalized note" : "Finalize note"}
        </button>
      </div>
    </section>
  );
}

function StructuredField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="text-sm">
      <div className="mb-2 font-medium">{label}</div>
      <textarea className="field min-h-[120px]" value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}
