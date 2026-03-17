"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { BookableSlot } from "@/lib/carebridge/scheduling";

type RescheduleAppointmentFormProps = {
  appointmentId: string;
  slots: BookableSlot[];
  returnHref: string;
};

export default function RescheduleAppointmentForm({
  appointmentId,
  slots,
  returnHref,
}: RescheduleAppointmentFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const dateOptions = useMemo(
    () =>
      Array.from(
        new Map(slots.map((slot) => [slot.dateKey, { dateKey: slot.dateKey, dateLabel: slot.dateLabel }])).values()
      ),
    [slots]
  );
  const [selectedDate, setSelectedDate] = useState(dateOptions[0]?.dateKey ?? "");
  const daySlots = useMemo(() => slots.filter((slot) => slot.dateKey === selectedDate), [selectedDate, slots]);
  const [selectedSlotStart, setSelectedSlotStart] = useState(daySlots[0]?.startIso ?? "");

  useEffect(() => {
    if (!daySlots.some((slot) => slot.startIso === selectedSlotStart)) {
      setSelectedSlotStart(daySlots[0]?.startIso ?? "");
    }
  }, [daySlots, selectedSlotStart]);

  const selectedSlot = daySlots.find((slot) => slot.startIso === selectedSlotStart) ?? null;

  async function onSubmit() {
    if (!selectedSlot) {
      setMessage("Please choose a new time slot.");
      return;
    }

    setLoading(true);
    setMessage(null);

    const response = await fetch(`/api/appointments/${appointmentId}/reschedule`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        startIso: selectedSlot.startIso,
        endIso: selectedSlot.endIso,
        timezone: selectedSlot.timezone,
      }),
    });

    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    setLoading(false);

    if (!response.ok) {
      setMessage(payload.error ?? "Could not reschedule appointment.");
      return;
    }

    router.push(returnHref);
    router.refresh();
  }

  return (
    <div className="panel px-6 py-6 sm:px-8">
      <h2 className="text-2xl font-semibold">Choose a new time</h2>
      <p className="mt-3 text-sm leading-6 muted">
        Pick another available slot from this provider&apos;s live schedule. Availability is checked again when you confirm.
      </p>

      <div className="mt-5 space-y-4">
        <label className="text-sm">
          <div className="mb-2 font-medium">Date</div>
          <select value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} className="field" disabled={dateOptions.length === 0}>
            {dateOptions.length === 0 ? <option value="">No dates available</option> : null}
            {dateOptions.map((option) => (
              <option key={option.dateKey} value={option.dateKey}>
                {option.dateLabel}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm">
          <div className="mb-2 font-medium">Time slot</div>
          <select value={selectedSlotStart} onChange={(event) => setSelectedSlotStart(event.target.value)} className="field" disabled={daySlots.length === 0}>
            {daySlots.length === 0 ? <option value="">No slots available</option> : null}
            {daySlots.map((slot) => (
              <option key={slot.startIso} value={slot.startIso}>
                {slot.timeLabel} ({slot.timezone})
              </option>
            ))}
          </select>
        </label>
      </div>

      {message ? <div className="mt-4 rounded-2xl border border-[var(--border)] bg-white/70 p-3 text-sm">{message}</div> : null}

      <div className="mt-5 flex flex-wrap gap-3">
        <button type="button" className="btn-primary px-4 py-2 text-sm" onClick={onSubmit} disabled={loading || !selectedSlot}>
          {loading ? "Saving..." : "Confirm new time"}
        </button>
        <button type="button" className="btn-secondary px-4 py-2 text-sm" onClick={() => router.push(returnHref)}>
          Cancel
        </button>
      </div>
    </div>
  );
}
