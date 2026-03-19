"use client";

import { useMemo, useState } from "react";
import type { PatientFollowUpSummaryRecord } from "@/lib/carebridge/types";

type PatientFollowUpEditorProps = {
  appointmentId: string;
  patientId: string;
  visitId?: string | null;
  initialFollowUp: PatientFollowUpSummaryRecord | null;
  compact?: boolean;
};

export default function PatientFollowUpEditor({
  appointmentId,
  patientId,
  visitId = null,
  initialFollowUp,
  compact = false,
}: PatientFollowUpEditorProps) {
  const [title, setTitle] = useState(initialFollowUp?.follow_up_title ?? "");
  const [summary, setSummary] = useState(initialFollowUp?.follow_up_summary ?? "");
  const [instructions, setInstructions] = useState(initialFollowUp?.follow_up_instructions ?? "");
  const [whatToTrack, setWhatToTrack] = useState(initialFollowUp?.what_to_track ?? "");
  const [recommendedNextStep, setRecommendedNextStep] = useState(initialFollowUp?.recommended_next_step ?? "");
  const [savedFollowUp, setSavedFollowUp] = useState<PatientFollowUpSummaryRecord | null>(initialFollowUp);
  const [savingState, setSavingState] = useState<"draft" | "published" | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const updatedLabel = useMemo(() => {
    if (!savedFollowUp?.updated_at) return "Not saved yet";
    return `Last updated ${new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(savedFollowUp.updated_at))}`;
  }, [savedFollowUp?.updated_at]);

  async function save(nextStatus: "draft" | "published") {
    setSavingState(nextStatus);
    setMessage(null);

    const response = await fetch("/api/patient-follow-ups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        appointmentId,
        patientId,
        visitId,
        followUpTitle: title,
        followUpSummary: summary,
        followUpInstructions: instructions,
        whatToTrack,
        recommendedNextStep,
        status: nextStatus,
      }),
    });

    const payload = (await response.json().catch(() => ({}))) as {
      error?: string;
      followUp?: PatientFollowUpSummaryRecord;
    };
    setSavingState(null);

    if (!response.ok) {
      setMessage(payload.error ?? "Could not save patient follow-up.");
      return;
    }

    setSavedFollowUp(payload.followUp ?? null);
    setMessage(nextStatus === "published" ? "Patient follow-up published." : "Patient follow-up draft saved.");
  }

  return (
    <section className="panel px-5 py-5">
      <div className={`flex ${compact ? "flex-col" : "flex-col sm:flex-row sm:items-start sm:justify-between"} gap-3`}>
        <div>
          <div className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)]">Patient follow-up</div>
          <div className="mt-2 text-xl font-semibold">Shared with the patient</div>
          <div className="mt-2 text-sm leading-6 muted">
            Keep this short, practical, and easy to act on. This is the only post-visit summary the patient sees.
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-full border border-[var(--border)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em]">
            {savedFollowUp?.status ?? "draft"}
          </span>
          <span className="text-xs muted">{updatedLabel}</span>
        </div>
      </div>

      <div className="mt-5 grid gap-4">
        <label className="text-sm">
          <div className="mb-2 font-medium">Follow-up title</div>
          <input
            className="field"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Visit follow-up"
          />
        </label>

        <label className="text-sm">
          <div className="mb-2 font-medium">Summary of today’s visit</div>
          <textarea
            className={`field ${compact ? "min-h-[140px]" : "min-h-[160px]"}`}
            value={summary}
            onChange={(event) => setSummary(event.target.value)}
            placeholder="Summarize what was discussed in clear patient-friendly language."
          />
        </label>

        <FollowUpField
          label="Next steps"
          value={instructions}
          onChange={setInstructions}
          placeholder="Medication, routine, scheduling, or care plan steps."
        />
        <FollowUpField
          label="What to track"
          value={whatToTrack}
          onChange={setWhatToTrack}
          placeholder="Symptoms, blood pressure, sleep, stress, or other signs to watch."
        />
        <FollowUpField
          label="Recommended follow-up timing"
          value={recommendedNextStep}
          onChange={setRecommendedNextStep}
          placeholder="Example: Follow up in 2 weeks or message sooner if symptoms worsen."
        />
      </div>

      {savedFollowUp?.published_at ? (
        <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--accent-soft)]/45 p-3 text-sm">
          Published{" "}
          {new Intl.DateTimeFormat("en-US", {
            dateStyle: "medium",
            timeStyle: "short",
          }).format(new Date(savedFollowUp.published_at))}
        </div>
      ) : null}

      {message ? <div className="mt-4 rounded-2xl border border-[var(--border)] bg-white/70 p-3 text-sm">{message}</div> : null}

      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="button"
          className="btn-secondary px-4 py-2 text-sm"
          disabled={savingState !== null}
          onClick={() => save("draft")}
        >
          {savingState === "draft" ? "Saving..." : "Save draft"}
        </button>
        <button
          type="button"
          className="btn-primary px-4 py-2 text-sm"
          disabled={savingState !== null}
          onClick={() => save("published")}
        >
          {savingState === "published" ? "Publishing..." : "Publish follow-up"}
        </button>
      </div>
    </section>
  );
}

function FollowUpField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <label className="text-sm">
      <div className="mb-2 font-medium">{label}</div>
      <textarea
        className="field min-h-[110px]"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
      />
    </label>
  );
}
