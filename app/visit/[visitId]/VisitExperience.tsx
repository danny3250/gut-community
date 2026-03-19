"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import PatientFollowUpEditor from "@/app/components/provider-notes/PatientFollowUpEditor";
import ProviderVisitNoteEditor from "@/app/components/provider-notes/ProviderVisitNoteEditor";
import type { ProviderVisitNoteWithAppointment } from "@/lib/carebridge/provider-notes";
import type { PatientFollowUpSummaryRecord, ProviderVisitNoteRecord } from "@/lib/carebridge/types";

type VisitExperienceProps = {
  visitId: string;
  participantRole: "patient" | "provider" | "admin";
  initialStatus: string;
  initialPatientJoinedAt: string | null;
  initialProviderJoinedAt: string | null;
  initialEndedAt: string | null;
  providerName: string;
  patientName: string;
  appointmentType: string;
  appointmentTime: string;
  startedAt: string | null;
  appointmentId: string | null;
  patientId: string | null;
  initialNote: ProviderVisitNoteRecord | null;
  initialFollowUp: PatientFollowUpSummaryRecord | null;
  recentNotes: ProviderVisitNoteWithAppointment[];
  currentAppointmentSummary: {
    id: string;
    startTime: string;
    timezone: string;
    appointmentType: string;
    status: string;
  } | null;
};

export default function VisitExperience({
  visitId,
  participantRole,
  initialStatus,
  initialPatientJoinedAt,
  initialProviderJoinedAt,
  initialEndedAt,
  providerName,
  patientName,
  appointmentType,
  appointmentTime,
  startedAt,
  appointmentId,
  patientId,
  initialNote,
  initialFollowUp,
  recentNotes,
  currentAppointmentSummary,
}: VisitExperienceProps) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [patientJoinedAt, setPatientJoinedAt] = useState(initialPatientJoinedAt);
  const [providerJoinedAt, setProviderJoinedAt] = useState(initialProviderJoinedAt);
  const [visitStartedAt, setVisitStartedAt] = useState(startedAt);
  const [endedAt, setEndedAt] = useState(initialEndedAt);
  const [endLoading, setEndLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (status === "completed" || status === "cancelled") return;

    let cancelled = false;

    const syncVisitState = async () => {
      const response = await fetch(`/api/visits/${visitId}`, { cache: "no-store" });
      if (!response.ok || cancelled) return;

      const payload = (await response.json()) as {
        status?: string;
        patientJoinedAt?: string | null;
        providerJoinedAt?: string | null;
        startedAt?: string | null;
        endedAt?: string | null;
      };

      if (cancelled) return;
      if (payload.status) setStatus(payload.status);
      setPatientJoinedAt(payload.patientJoinedAt ?? null);
      setProviderJoinedAt(payload.providerJoinedAt ?? null);
      setVisitStartedAt(payload.startedAt ?? null);
      setEndedAt(payload.endedAt ?? null);
    };

    syncVisitState();
    const poller = window.setInterval(syncVisitState, 15000);

    return () => {
      cancelled = true;
      window.clearInterval(poller);
    };
  }, [status, visitId]);

  const elapsed = useMemo(() => {
    if (!visitStartedAt) return "00:00";
    const sessionEnd = endedAt ? new Date(endedAt).getTime() : now;
    const diffMs = Math.max(0, sessionEnd - new Date(visitStartedAt).getTime());
    const totalSeconds = Math.floor(diffMs / 1000);
    const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
    const seconds = String(totalSeconds % 60).padStart(2, "0");
    return `${minutes}:${seconds}`;
  }, [endedAt, now, visitStartedAt]);

  async function onEndVisit() {
    setEndLoading(true);
    setMessage(null);

    const response = await fetch(`/api/visits/${visitId}/end`, { method: "POST" });
    const payload = (await response.json()) as { status?: string; error?: string };
    setEndLoading(false);

    if (!response.ok) {
      setMessage(payload.error ?? "Could not end visit.");
      return;
    }

    setStatus(payload.status ?? "completed");
    setEndedAt(new Date().toISOString());
    router.refresh();
  }

  const providerPresent = Boolean(providerJoinedAt);
  const patientPresent = Boolean(patientJoinedAt);
  const sessionState = getSessionState({
    status,
    participantRole,
    providerPresent,
    patientPresent,
    endedAt,
  });

  const participantBadges = [
    { label: providerName, state: providerPresent ? "Joined" : "Waiting" },
    { label: patientName, state: patientPresent ? "Joined" : "Waiting" },
  ];

  const visitHeader = (
    <section className="flex flex-col gap-4 border-b border-[var(--border)] pb-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)]">
          Live telehealth visit
        </div>
        <div className="mt-1 text-2xl font-semibold tracking-tight">
          {providerName} with {patientName}
        </div>
        <div className="mt-2 text-sm muted">
          {appointmentType.replace(/_/g, " ")} · {appointmentTime}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <span className="rounded-full border border-[var(--border)] bg-[var(--surface-secondary)] px-3 py-1 text-sm font-semibold capitalize">
          {sessionState.label}
        </span>
        {participantRole !== "patient" ? (
          <button type="button" className="btn-secondary px-4 py-2 text-sm" onClick={onEndVisit} disabled={endLoading}>
            {endLoading ? "Ending..." : "End visit"}
          </button>
        ) : null}
      </div>
    </section>
  );

  const sessionRoom = (
    <div className="panel flex min-h-[390px] flex-col justify-between px-6 py-6 sm:px-8 xl:h-[calc(100vh-13rem)]">
      <div>
        <div className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)]">
          Session room
        </div>
        <div className="mt-4 text-2xl font-semibold">{sessionState.heroTitle}</div>
        <p className="mt-3 max-w-2xl text-sm leading-6 muted">{sessionState.description}</p>
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        {participantBadges.map((participant) => (
          <div
            key={participant.label}
            className="rounded-[24px] border border-[var(--border)] bg-white/78 px-4 py-4"
          >
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--accent-strong)]">
              Participant
            </div>
            <div className="mt-2 text-base font-semibold">{participant.label}</div>
            <div className="mt-3 flex items-center gap-2 text-sm">
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  participant.state === "Joined" ? "bg-emerald-500" : "bg-amber-400"
                }`}
              />
              <span className="muted">{participant.state}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-[24px] border border-dashed border-[var(--border)] bg-[var(--surface-secondary)] px-4 py-4 text-sm leading-6 muted">
        Video, screen share, and session controls can attach here later. For now, this workspace keeps the live visit
        context visible while notes and follow-up work continue alongside it.
      </div>
    </div>
  );

  const rightColumn = (
    <>
      <div className="hidden xl:block">{visitHeader}</div>

      <div className="panel px-5 py-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)]">
              Session status
            </div>
            <div className="mt-2 text-lg font-semibold">{sessionState.label}</div>
          </div>
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-secondary)] px-3 py-2 text-right">
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] muted">Timer</div>
            <div className="mt-1 text-base font-semibold">{elapsed}</div>
          </div>
        </div>

        <div className="mt-4 text-sm leading-6 muted">{sessionState.description}</div>

        <div className="mt-5 space-y-3">
          {participantBadges.map((participant) => (
            <div
              key={participant.label}
              className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--border)] bg-white/72 px-4 py-3"
            >
              <span className="text-sm font-medium">{participant.label}</span>
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                  participant.state === "Joined"
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-amber-100 text-amber-700"
                }`}
              >
                {participant.state}
              </span>
            </div>
          ))}
        </div>

        {sessionState.hint ? (
          <div className="mt-5 rounded-2xl border border-[var(--border)] bg-[var(--surface-secondary)] px-4 py-3 text-sm leading-6 muted">
            {sessionState.hint}
          </div>
        ) : null}
      </div>

      {participantRole === "provider" && appointmentId && patientId ? (
        <>
          <ProviderVisitNoteEditor
            appointmentId={appointmentId}
            patientId={patientId}
            visitId={visitId}
            initialNote={initialNote}
            recentNotes={recentNotes}
            currentAppointmentSummary={currentAppointmentSummary}
            compact
          />
          <PatientFollowUpEditor
            appointmentId={appointmentId}
            patientId={patientId}
            visitId={visitId}
            initialFollowUp={initialFollowUp}
            compact
          />
        </>
      ) : null}

      {message ? <div className="panel px-5 py-4 text-sm">{message}</div> : null}
    </>
  );

  return (
    <div className="space-y-4">
      <div className="xl:hidden">{visitHeader}</div>

      <section className="space-y-5 xl:hidden">
        {sessionRoom}
        {rightColumn}
      </section>

      <section className="hidden xl:grid xl:grid-cols-[minmax(0,1fr)_420px] xl:items-start xl:gap-6">
        <div className="relative">
          <div className="pointer-events-none h-[calc(100vh-13rem)]" />
          <div className="fixed top-44 left-[max(2rem,calc((100vw-80rem)/2+2rem))] z-10 w-[calc(min(80rem,100vw)-4rem-26.25rem-1.5rem)]">
            {sessionRoom}
          </div>
        </div>

        <aside className="space-y-5">
          {rightColumn}
        </aside>
      </section>
    </div>
  );
}

function getSessionState({
  status,
  participantRole,
  providerPresent,
  patientPresent,
  endedAt,
}: {
  status: string;
  participantRole: "patient" | "provider" | "admin";
  providerPresent: boolean;
  patientPresent: boolean;
  endedAt: string | null;
}) {
  if (endedAt || status === "completed" || status === "cancelled") {
    return {
      label: "Visit ended",
      heroTitle: "Visit ended",
      description: "This session has been closed. Any follow-up notes or summary work can continue after the visit.",
      hint: participantRole === "provider" ? "You can still review your note and finalize documentation if needed." : null,
    };
  }

  if (providerPresent && patientPresent) {
    return {
      label: status === "in_progress" ? "Visit in progress" : "Both participants connected",
      heroTitle: "Both participants are connected",
      description: "The visit workspace is active and ready for conversation, note-taking, and follow-up planning.",
      hint: participantRole === "provider" ? "Keep the visit room visible while you work through notes and next steps." : null,
    };
  }

  if (providerPresent && !patientPresent) {
    return {
      label: "Waiting for patient",
      heroTitle: "Waiting for patient to join",
      description: "The provider is in the room. The visit will move into progress as soon as the patient joins.",
      hint: "Stay on this page to monitor when the patient enters the session.",
    };
  }

  if (!providerPresent && patientPresent) {
    return {
      label: "Waiting for provider",
      heroTitle: "Waiting for provider to join",
      description: "The patient is ready in the visit room and will be connected as soon as the provider joins.",
      hint: "If the wait feels longer than expected, stay on this page while the session updates.",
    };
  }

  return {
    label: "Preparing visit",
    heroTitle: "Preparing the visit room",
    description: "The session is being prepared and participant presence will update here as each person joins.",
    hint: "This page will reflect when the provider and patient have entered the room.",
  };
}
