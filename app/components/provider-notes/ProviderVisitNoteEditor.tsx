"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { getProviderVisitNotePreview, type ProviderVisitNoteWithAppointment } from "@/lib/carebridge/provider-notes";
import type { ProviderVisitNoteRecord } from "@/lib/carebridge/types";

type ProviderVisitNoteEditorProps = {
  appointmentId: string;
  patientId: string;
  visitId?: string | null;
  initialNote: ProviderVisitNoteRecord | null;
  recentNotes: ProviderVisitNoteWithAppointment[];
  currentAppointmentSummary: {
    id: string;
    startTime: string;
    timezone: string;
    appointmentType: string;
    status: string;
  } | null;
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
  recentNotes,
  currentAppointmentSummary,
  compact = false,
}: ProviderVisitNoteEditorProps) {
  const editableNote = initialNote?.status === "draft" ? initialNote : null;
  const [subject, setSubject] = useState(editableNote?.subject ?? "");
  const [noteBody, setNoteBody] = useState(editableNote?.note_body ?? "");
  const [structured, setStructured] = useState<StructuredValue>(() => getStructuredValues(editableNote));
  const [status, setStatus] = useState<"draft" | "finalized">("draft");
  const [savedNote, setSavedNote] = useState<ProviderVisitNoteRecord | null>(editableNote);
  const [history, setHistory] = useState<ProviderVisitNoteWithAppointment[]>(recentNotes);
  const [savingState, setSavingState] = useState<"draft" | "finalized" | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const updatedLabel = useMemo(() => {
    if (!savedNote?.updated_at) return "Not saved yet";
    return `Last updated ${new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(savedNote.updated_at))}`;
  }, [savedNote?.updated_at]);

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

    const returnedNote = payload.note ?? null;

    if (nextStatus === "finalized" && returnedNote) {
      setHistory((current) => {
        const nextEntry: ProviderVisitNoteWithAppointment = {
          ...returnedNote,
          appointments: currentAppointmentSummary
            ? {
                id: currentAppointmentSummary.id,
                start_time: currentAppointmentSummary.startTime,
                timezone: currentAppointmentSummary.timezone,
                appointment_type: currentAppointmentSummary.appointmentType,
                status: currentAppointmentSummary.status,
              }
            : null,
        };

        const remaining = current.filter((note) => note.id !== returnedNote.id);
        return [nextEntry, ...remaining].slice(0, 6);
      });
      setSubject("");
      setNoteBody("");
      setStructured({
        reason_for_visit: "",
        symptoms_discussed: "",
        observations: "",
        follow_up_plan: "",
      });
      setSavedNote(null);
      setStatus("draft");
      setMessage("Finalized note saved to this patient's note history.");
      return;
    }

    setSavedNote(returnedNote);
    setStatus(returnedNote?.status === "finalized" ? "finalized" : "draft");
    setMessage("Draft saved.");
  }

  return (
    <section className="panel px-5 py-5">
      <div className={`flex ${compact ? "flex-col" : "flex-col sm:flex-row sm:items-start sm:justify-between"} gap-3`}>
        <div>
          <div className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)]">Private visit notes</div>
          <div className="mt-2 text-xl font-semibold">{editableNote ? "Continue your note" : "Start a draft note"}</div>
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
          <input className="field" value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="Follow-up on care plan" />
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

        <div className="rounded-[24px] border border-[var(--border)] bg-[var(--surface-secondary)] px-4 py-4">
          <div className="text-sm font-semibold">Structured visit details</div>
          <div className="mt-1 text-sm muted">
            Keep supporting details in one vertical flow so the note is easier to manage during a live visit.
          </div>

          <div className="mt-4 grid gap-4">
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
          {savingState === "finalized" ? "Finalizing..." : "Update finalized note"}
        </button>
      </div>

      <div className="mt-6 border-t border-[var(--border)] pt-5">
        <div className="text-sm font-semibold">Patient note history</div>
        <div className="mt-2 text-sm muted">Finalized notes for this patient stay here for quick reference during future visits.</div>

        <div className="mt-4 space-y-3">
          {history.length === 0 ? (
            <div className="rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-4 text-sm muted">
              No finalized notes for this patient yet.
            </div>
          ) : (
            history.map((note) => {
              const appointment = Array.isArray(note.appointments) ? note.appointments[0] ?? null : note.appointments ?? null;
              return (
                <div key={note.id} className="rounded-2xl border border-[var(--border)] bg-white/72 px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold">{note.subject ?? "Visit note"}</div>
                      <div className="mt-1 text-xs muted">
                        {appointment
                          ? new Intl.DateTimeFormat("en-US", {
                              dateStyle: "medium",
                              timeStyle: "short",
                              timeZone: appointment.timezone,
                            }).format(new Date(appointment.start_time))
                          : "Recent patient note"}
                      </div>
                    </div>
                    <span className="rounded-full border border-[var(--border)] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]">
                      {note.status}
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-6 muted">{getProviderVisitNotePreview(note.note_body, 120)}</p>
                  {appointment?.id ? (
                    <Link
                      href={`/provider/appointments/${appointment.id}`}
                      className="mt-3 inline-flex text-sm font-medium text-[var(--accent-strong)] hover:opacity-80"
                    >
                      Open appointment note
                    </Link>
                  ) : null}
                </div>
              );
            })
          )}
        </div>
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
      <textarea className="field min-h-[110px]" value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}
