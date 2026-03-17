"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type VisitExperienceProps = {
  visitId: string;
  participantRole: "patient" | "provider" | "admin";
  initialStatus: string;
  providerName: string;
  patientName: string;
  appointmentType: string;
  appointmentTime: string;
  startedAt: string | null;
};

export default function VisitExperience({
  visitId,
  participantRole,
  initialStatus,
  providerName,
  patientName,
  appointmentType,
  appointmentTime,
  startedAt,
}: VisitExperienceProps) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [endLoading, setEndLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [now, setNow] = useState<number>(() => (startedAt ? new Date(startedAt).getTime() : 0));

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const elapsed = useMemo(() => {
    if (!startedAt) return "00:00";
    const diffMs = Math.max(0, now - new Date(startedAt).getTime());
    const totalSeconds = Math.floor(diffMs / 1000);
    const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
    const seconds = String(totalSeconds % 60).padStart(2, "0");
    return `${minutes}:${seconds}`;
  }, [now, startedAt]);

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
    router.refresh();
  }

  const waitingMessage =
    participantRole === "patient"
      ? "Your provider will join shortly."
      : "The patient will be able to join as soon as they enter the waiting room.";

  const isWaiting =
    status === "scheduled" ||
    status === "waiting_room" ||
    status === "provider_joined";

  return (
    <div className="space-y-5">
      <section className="panel flex flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <div>
          <div className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)]">
            Telehealth visit
          </div>
          <div className="mt-1 text-xl font-semibold">
            {providerName} with {patientName}
          </div>
          <div className="mt-1 text-sm muted">
            {appointmentType.replace(/_/g, " ")} · {appointmentTime}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-full border border-[var(--border)] px-3 py-1 text-sm font-semibold capitalize">
            {status.replace(/_/g, " ")}
          </span>
          <span className="rounded-full bg-white/72 px-4 py-2 text-sm muted">Visit timer {elapsed}</span>
          {participantRole !== "patient" ? (
            <button type="button" className="btn-secondary px-4 py-2 text-sm" onClick={onEndVisit} disabled={endLoading}>
              {endLoading ? "Ending..." : "End visit"}
            </button>
          ) : null}
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="panel flex min-h-[420px] flex-col items-center justify-center px-6 py-8 sm:px-8">
          <div className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)]">
            Video session
          </div>
          <div className="mt-4 text-2xl font-semibold">Video session loading</div>
          <p className="mt-3 max-w-xl text-center text-sm leading-6 muted">
            {isWaiting
              ? waitingMessage
              : "The visit is active. Video, screen share, file sharing, and post-visit workflows can attach here later."}
          </p>
        </div>

        <aside className="space-y-5">
          <div className="panel px-5 py-5">
            <div className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)]">
              Visit status
            </div>
            <div className="mt-3 text-sm leading-6 muted">
              {isWaiting
                ? waitingMessage
                : "Both participants are connected. TODO: attach secure notes, screen sharing, and Chime media components here."}
            </div>
          </div>

          <div className="panel px-5 py-5">
            <div className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)]">
              Notes placeholder
            </div>
            <div className="mt-3 text-sm leading-6 muted">
              TODO: add secure visit notes, file sharing, audit logging, and post-visit summary support after workflow review.
            </div>
          </div>

          {message ? <div className="panel px-5 py-4 text-sm">{message}</div> : null}
        </aside>
      </section>
    </div>
  );
}
