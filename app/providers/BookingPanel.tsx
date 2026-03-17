"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BookableSlot } from "@/lib/carebridge/scheduling";

type BookingPanelProps = {
  providerId: string;
  providerSlug: string;
  organizationId: string | null;
  visitTypes: string[];
  slots: BookableSlot[];
  isAuthenticated: boolean;
  canBook: boolean;
  eligibilityMessage: string | null;
};

export default function BookingPanel({
  providerId,
  providerSlug,
  organizationId,
  visitTypes,
  slots,
  isAuthenticated,
  canBook,
  eligibilityMessage,
}: BookingPanelProps) {
  const router = useRouter();
  const [appointmentType, setAppointmentType] = useState(visitTypes[0] ?? "telehealth");
  const dateOptions = useMemo(
    () =>
      Array.from(
        new Map(
          slots.map((slot) => [
            slot.dateKey,
            {
              dateKey: slot.dateKey,
              dateLabel: slot.dateLabel,
            },
          ])
        ).values()
      ),
    [slots]
  );
  const [selectedDate, setSelectedDate] = useState(dateOptions[0]?.dateKey ?? "");
  const filteredSlots = useMemo(
    () => slots.filter((slot) => slot.dateKey === selectedDate),
    [selectedDate, slots]
  );
  const [selectedSlotStart, setSelectedSlotStart] = useState(filteredSlots[0]?.startIso ?? slots[0]?.startIso ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!filteredSlots.some((slot) => slot.startIso === selectedSlotStart)) {
      setSelectedSlotStart(filteredSlots[0]?.startIso ?? "");
    }
  }, [filteredSlots, selectedSlotStart]);

  const selectedSlot = useMemo(
    () => slots.find((slot) => slot.startIso === selectedSlotStart) ?? null,
    [selectedSlotStart, slots]
  );

  const nextHref = `/providers/${providerSlug}`;

  async function onBook() {
    if (!selectedSlot) {
      setMessage("Please choose an available time slot.");
      return;
    }

    setLoading(true);
    setMessage(null);

    const response = await fetch("/api/appointments/book", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        providerId,
        organizationId,
        appointmentType,
        startIso: selectedSlot.startIso,
        endIso: selectedSlot.endIso,
        timezone: selectedSlot.timezone,
      }),
    });

    const payload = (await response.json()) as { error?: string };
    setLoading(false);

    if (!response.ok) {
      setMessage(payload.error ?? "Could not request appointment.");
      return;
    }

    router.push("/portal/appointments?booked=1");
    router.refresh();
  }

  if (!isAuthenticated) {
    return (
      <div className="rounded-[24px] border border-[var(--border)] bg-white/74 px-5 py-5">
        <div className="text-lg font-semibold">Sign in to book</div>
        <p className="mt-2 text-sm leading-6 muted">
          You can browse provider profiles publicly. Sign in or create an account to request an appointment.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href={`/login?next=${encodeURIComponent(nextHref)}`} className="btn-primary px-4 py-2 text-sm">
            Sign in
          </Link>
          <Link href={`/signup?next=${encodeURIComponent(nextHref)}`} className="btn-secondary px-4 py-2 text-sm">
            Create account
          </Link>
        </div>
      </div>
    );
  }

  if (!canBook) {
    return (
      <div className="rounded-[24px] border border-[var(--border)] bg-white/74 px-5 py-5">
        <div className="text-lg font-semibold">Booking unavailable</div>
        <p className="mt-2 text-sm leading-6 muted">
          {eligibilityMessage ?? "This provider is not currently available for booking from your account."}
        </p>
        <div className="mt-4">
          <Link href={`/providers/${providerSlug}`} className="btn-secondary px-4 py-2 text-sm">
            View provider profile
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-[24px] border border-[var(--border)] bg-white/74 px-5 py-5">
      <div className="text-lg font-semibold">Request an appointment</div>
      <p className="mt-2 text-sm leading-6 muted">
        Choose a visit type, select a time slot, and confirm your request. Telehealth session launch will
        connect here later through the Amazon Chime SDK adapter layer.
      </p>

      <div className="mt-5 space-y-4">
        <label className="text-sm">
          <div className="mb-2 font-medium">Appointment type</div>
          <select value={appointmentType} onChange={(event) => setAppointmentType(event.target.value)} className="field">
            {visitTypes.map((type) => (
              <option key={type} value={type}>
                {formatVisitType(type)}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm">
          <div className="mb-2 font-medium">Select date</div>
          <select value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} className="field" disabled={dateOptions.length === 0}>
            {dateOptions.map((option) => (
              <option key={option.dateKey} value={option.dateKey}>
                {option.dateLabel}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm">
          <div className="mb-2 font-medium">Available time slots</div>
          <select
            value={selectedSlotStart}
            onChange={(event) => setSelectedSlotStart(event.target.value)}
            className="field"
            disabled={filteredSlots.length === 0}
          >
            {filteredSlots.length === 0 ? (
              <option value="">No slots available for this date</option>
            ) : (
              filteredSlots.map((slot) => (
                <option key={slot.startIso} value={slot.startIso}>
                  {slot.timeLabel} ({slot.timezone})
                </option>
              ))
            )}
          </select>
        </label>
      </div>

      {message ? <div className="mt-4 rounded-2xl border border-[var(--border)] bg-white/70 p-3 text-sm">{message}</div> : null}

      <div className="mt-5">
        <button type="button" className="btn-primary" onClick={onBook} disabled={loading || !selectedSlot}>
          {loading ? "Submitting..." : "Confirm appointment request"}
        </button>
      </div>
    </div>
  );
}

function formatVisitType(value: string) {
  return value
    .split("_")
    .join(" ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}
