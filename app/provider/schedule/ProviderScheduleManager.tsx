"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ProviderCalendarDay } from "@/lib/carebridge/scheduling";
import { ProviderTimeBlockRecord } from "@/lib/carebridge/types";

type AvailabilityRow = {
  id: string;
  day_of_week: number | null;
  weekday: number | null;
  start_local_time: string;
  end_local_time: string;
  timezone: string;
  slot_duration_minutes: number | null;
};

type AppointmentRow = {
  id: string;
  status: string;
  appointment_type: string;
  start_time: string;
  end_time?: string;
  timezone: string;
  patients?: { legal_name: string | null; email: string | null } | { legal_name: string | null; email: string | null }[] | null;
};

export type ProviderScheduleManagerProps = {
  providerId: string;
  initialAvailability: AvailabilityRow[];
  initialAppointments: AppointmentRow[];
  initialTimeBlocks: ProviderTimeBlockRecord[];
  initialCalendarDays: ProviderCalendarDay[];
};

export default function ProviderScheduleManager({
  providerId,
  initialAvailability,
  initialAppointments,
  initialTimeBlocks,
  initialCalendarDays,
}: ProviderScheduleManagerProps) {
  const supabase = createClient();
  const [appointments, setAppointments] = useState(initialAppointments);
  const [timeBlocks, setTimeBlocks] = useState(initialTimeBlocks);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [blockStart, setBlockStart] = useState(toLocalDateTimeInput(addHours(new Date(), 2)));
  const [blockEnd, setBlockEnd] = useState(toLocalDateTimeInput(addHours(new Date(), 3)));
  const [blockReason, setBlockReason] = useState("Lunch");

  const todayAppointments = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return appointments.filter((appointment) => appointment.start_time.slice(0, 10) === today);
  }, [appointments]);

  const upcomingAppointments = useMemo(
    () =>
      appointments
        .filter((appointment) => new Date(appointment.start_time) >= new Date())
        .sort((a, b) => a.start_time.localeCompare(b.start_time))
        .slice(0, 12),
    [appointments]
  );

  const weeklyDays = useMemo(
    () =>
      initialCalendarDays.map((day) => ({
        ...day,
        appointments: appointments.filter((appointment) => day.dateKey === appointment.start_time.slice(0, 10)),
        timeBlocks: timeBlocks.filter((block) => overlapsDateKey(block, day.dateKey)),
        openSlots: day.openSlots.filter(
          (slot) =>
            !appointments.some(
              (appointment) =>
                (appointment.status === "requested" || appointment.status === "confirmed") &&
                slot.startIso < (appointment.end_time ?? appointment.start_time) &&
                slot.endIso > appointment.start_time
            ) &&
            !timeBlocks.some(
              (block) => slot.startIso < block.end_time && slot.endIso > block.start_time
            )
        ),
      })),
    [appointments, initialCalendarDays, timeBlocks]
  );

  async function createTimeBlock() {
    setSaving(true);
    setMessage(null);

    if (!blockStart || !blockEnd || new Date(blockStart) >= new Date(blockEnd)) {
      setSaving(false);
      setMessage("Choose a valid blocked time range.");
      return;
    }

    const { data, error } = await supabase
      .from("provider_time_blocks")
      .insert({
        provider_id: providerId,
        start_time: new Date(blockStart).toISOString(),
        end_time: new Date(blockEnd).toISOString(),
        reason: blockReason.trim() || null,
      })
      .select("id,provider_id,start_time,end_time,reason,created_at,updated_at")
      .single();

    setSaving(false);

    if (error || !data) {
      setMessage(error?.message ?? "Could not create the time block.");
      return;
    }

    setTimeBlocks((current) =>
      [...current, data as ProviderTimeBlockRecord].sort((a, b) => a.start_time.localeCompare(b.start_time))
    );
    setMessage("Time block added.");
  }

  async function removeTimeBlock(id: string) {
    const { error } = await supabase.from("provider_time_blocks").delete().eq("id", id);
    if (error) {
      setMessage(error.message);
      return;
    }

    setTimeBlocks((current) => current.filter((block) => block.id !== id));
    setMessage("Time block removed.");
  }

  async function updateAppointmentStatus(appointmentId: string, status: string) {
    const { error } = await supabase.from("appointments").update({ status }).eq("id", appointmentId);
    if (error) {
      setMessage(error.message);
      return;
    }

    setAppointments((current) =>
      current.map((appointment) =>
        appointment.id === appointmentId ? { ...appointment, status } : appointment
      )
    );
  }

  return (
    <div className="grid gap-5">
      <section className="panel px-6 py-6 sm:px-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <span className="eyebrow">Schedule</span>
            <h1 className="mt-4 text-3xl font-semibold sm:text-4xl">Provider calendar and booking operations</h1>
            <p className="mt-3 text-sm leading-6 muted">
              Review upcoming visits, manage blocked time, and keep your patient-facing schedule aligned with
              your recurring availability.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/provider/settings/availability" className="btn-secondary px-4 py-2 text-sm">
              Edit availability
            </Link>
          </div>
        </div>

        {message ? <div className="mt-5 rounded-[24px] border border-[var(--border)] bg-white/72 px-4 py-3 text-sm">{message}</div> : null}

        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          <SummaryCard label="Availability windows" value={String(initialAvailability.length)} helper="Weekly recurring windows" />
          <SummaryCard label="Today's appointments" value={String(todayAppointments.length)} helper="Visits on today’s calendar" />
          <SummaryCard label="Blocked time entries" value={String(timeBlocks.length)} helper="Breaks, meetings, and time away" />
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.25fr_0.75fr]">
        <section className="panel px-6 py-6 sm:px-8">
          <span className="eyebrow">Weekly calendar</span>
          <h2 className="mt-4 text-2xl font-semibold">This week at a glance</h2>
          <div className="mt-5 grid gap-3">
            {weeklyDays.map((day) => (
              <article key={day.dateKey} className="rounded-[24px] border border-[var(--border)] bg-white/72 px-4 py-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">{day.dateLabel}</h3>
                    <div className="mt-2 text-sm muted">
                      {day.openSlots.length} open slot{day.openSlots.length === 1 ? "" : "s"}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs muted">
                    <span className="rounded-full border border-[var(--border)] px-3 py-1">
                      {day.appointments.length} appointment{day.appointments.length === 1 ? "" : "s"}
                    </span>
                    <span className="rounded-full border border-[var(--border)] px-3 py-1">
                      {day.timeBlocks.length} block{day.timeBlocks.length === 1 ? "" : "s"}
                    </span>
                  </div>
                </div>

                <div className="mt-4 grid gap-4 lg:grid-cols-3">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)]">
                      Appointments
                    </div>
                    <div className="mt-3 grid gap-2">
                      {day.appointments.length === 0 ? (
                        <div className="text-sm muted">No booked visits.</div>
                      ) : (
                        day.appointments.map((appointment) => {
                          const patient = Array.isArray(appointment.patients) ? appointment.patients[0] : appointment.patients;
                          return (
                            <Link
                              key={appointment.id}
                              href={`/provider/appointments/${appointment.id}`}
                              className="rounded-[18px] border border-[var(--border)] bg-[var(--accent-soft)]/55 px-3 py-3 text-sm"
                            >
                              <div className="font-semibold">{patient?.legal_name || patient?.email || "Patient"}</div>
                              <div className="mt-1 muted">{formatDateTime(appointment.start_time, appointment.timezone)}</div>
                            </Link>
                          );
                        })
                      )}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)]">
                      Blocked time
                    </div>
                    <div className="mt-3 grid gap-2">
                      {day.timeBlocks.length === 0 ? (
                        <div className="text-sm muted">No blocked time.</div>
                      ) : (
                        day.timeBlocks.map((block) => (
                          <div key={block.id} className="rounded-[18px] border border-[var(--border)] bg-white px-3 py-3 text-sm">
                            <div className="font-semibold">{block.reason || "Blocked time"}</div>
                            <div className="mt-1 muted">
                              {formatDateTime(block.start_time)} - {formatDateTime(block.end_time)}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)]">
                      Open slots
                    </div>
                    <div className="mt-3 grid gap-2">
                      {day.openSlots.length === 0 ? (
                        <div className="text-sm muted">No availability left.</div>
                      ) : (
                        day.openSlots.slice(0, 6).map((slot) => (
                          <div key={slot.startIso} className="rounded-[18px] border border-[var(--border)] bg-white px-3 py-3 text-sm">
                            <div className="font-semibold">{slot.timeLabel}</div>
                            <div className="mt-1 muted">{slot.timezone}</div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <div className="grid gap-5">
          <section className="panel px-6 py-6 sm:px-8">
            <span className="eyebrow">Block time</span>
            <h2 className="mt-4 text-2xl font-semibold">Remove time from booking</h2>
            <div className="mt-5 grid gap-4">
              <label className="text-sm">
                <div className="mb-2 font-medium">Start</div>
                <input className="field" type="datetime-local" value={blockStart} onChange={(event) => setBlockStart(event.target.value)} />
              </label>
              <label className="text-sm">
                <div className="mb-2 font-medium">End</div>
                <input className="field" type="datetime-local" value={blockEnd} onChange={(event) => setBlockEnd(event.target.value)} />
              </label>
              <label className="text-sm">
                <div className="mb-2 font-medium">Reason</div>
                <input className="field" value={blockReason} onChange={(event) => setBlockReason(event.target.value)} placeholder="Lunch, meeting, vacation..." />
              </label>
              <button type="button" className="btn-primary" disabled={saving} onClick={createTimeBlock}>
                {saving ? "Saving..." : "Add blocked time"}
              </button>
            </div>
          </section>

          <section className="panel px-6 py-6 sm:px-8">
            <span className="eyebrow">Upcoming appointments</span>
            <h2 className="mt-4 text-2xl font-semibold">Next visits</h2>
            <div className="mt-5 grid gap-3">
              {upcomingAppointments.length === 0 ? (
                <div className="text-sm muted">No upcoming appointments yet.</div>
              ) : (
                upcomingAppointments.map((appointment) => {
                  const patient = Array.isArray(appointment.patients) ? appointment.patients[0] : appointment.patients;
                  return (
                    <div key={appointment.id} className="rounded-[24px] border border-[var(--border)] bg-white/72 px-4 py-4">
                      <div className="flex flex-col gap-4">
                        <div>
                          <div className="text-lg font-semibold">{patient?.legal_name || patient?.email || "Patient"}</div>
                          <div className="mt-1 text-sm muted">
                            {formatDateTime(appointment.start_time, appointment.timezone)} · {appointment.appointment_type.replace(/_/g, " ")}
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                          <select
                            className="field min-w-[160px]"
                            value={appointment.status}
                            onChange={(event) => updateAppointmentStatus(appointment.id, event.target.value)}
                          >
                            <option value="requested">Requested</option>
                            <option value="confirmed">Confirmed</option>
                            <option value="cancelled">Cancelled</option>
                            <option value="completed">Completed</option>
                          </select>
                          <Link href={`/provider/appointments/${appointment.id}`} className="btn-secondary px-4 py-2 text-sm">
                            Open appointment
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>

          <section className="panel px-6 py-6 sm:px-8">
            <span className="eyebrow">Blocked time list</span>
            <h2 className="mt-4 text-2xl font-semibold">Current blocked entries</h2>
            <div className="mt-5 grid gap-3">
              {timeBlocks.length === 0 ? (
                <div className="text-sm muted">No blocked time entries yet.</div>
              ) : (
                timeBlocks.map((block) => (
                  <div key={block.id} className="rounded-[24px] border border-[var(--border)] bg-white/72 px-4 py-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <div className="text-sm font-semibold">{block.reason || "Blocked time"}</div>
                        <div className="mt-1 text-sm muted">
                          {formatDateTime(block.start_time)} - {formatDateTime(block.end_time)}
                        </div>
                      </div>
                      <button type="button" className="btn-secondary px-4 py-2 text-sm" onClick={() => removeTimeBlock(block.id)}>
                        Remove
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}

function formatDateTime(value: string, timeZone?: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    ...(timeZone ? { timeZone } : {}),
  }).format(new Date(value));
}

function overlapsDateKey(block: ProviderTimeBlockRecord, dateKey: string) {
  return block.start_time.slice(0, 10) <= dateKey && block.end_time.slice(0, 10) >= dateKey;
}

function toLocalDateTimeInput(date: Date) {
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function addHours(date: Date, hours: number) {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

function SummaryCard({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <div className="rounded-[24px] border border-[var(--border)] bg-white/72 px-4 py-4">
      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)]">{label}</div>
      <div className="mt-2 text-3xl font-semibold">{value}</div>
      <div className="mt-2 text-sm muted">{helper}</div>
    </div>
  );
}
