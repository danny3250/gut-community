import { AppointmentRecord, ProviderAvailabilityRecord } from "@/lib/carebridge/types";
import { generateTimeSlots } from "@/lib/scheduling/slots";

export type ProviderGeneratedSlot = {
  startIso: string;
  endIso: string;
  timezone: string;
  label: string;
};

const WEEKDAY_MAP: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

export function generateUpcomingAvailabilitySlots(
  windows: ProviderAvailabilityRecord[],
  appointments: AppointmentRecord[],
  daysAhead = 14,
  now = new Date()
) {
  const activeAppointments = appointments.filter(
    (appointment) => appointment.status === "requested" || appointment.status === "confirmed"
  );
  const slots: ProviderGeneratedSlot[] = [];

  for (const window of windows) {
    const dayOfWeek = window.day_of_week ?? window.weekday ?? 0;
    const slotDurationMinutes = window.slot_duration_minutes ?? 30;

    for (let offset = 0; offset < daysAhead; offset += 1) {
      const candidate = new Date(now.getTime());
      candidate.setUTCDate(candidate.getUTCDate() + offset);
      const parts = getDatePartsInTimeZone(candidate, window.timezone);

      if (parts.weekday !== dayOfWeek) continue;

      const [startHour, startMinute] = parseTime(window.start_local_time);
      const [endHour, endMinute] = parseTime(window.end_local_time);

      const windowStart = zonedDateTimeToUtc(parts.year, parts.month, parts.day, startHour, startMinute, window.timezone);
      const windowEnd = zonedDateTimeToUtc(parts.year, parts.month, parts.day, endHour, endMinute, window.timezone);

      const generated = generateTimeSlots(
        {
          startIso: windowStart.toISOString(),
          endIso: windowEnd.toISOString(),
          slotMinutes: slotDurationMinutes,
        },
        window.timezone
      );

      for (const slot of generated) {
        if (new Date(slot.startIso) <= now) continue;
        if (hasConflict(slot.startIso, slot.endIso, activeAppointments)) continue;

        slots.push({
          ...slot,
          label: formatSlotLabel(slot.startIso, window.timezone),
        });
      }
    }
  }

  return slots.sort((a, b) => a.startIso.localeCompare(b.startIso));
}

function hasConflict(startIso: string, endIso: string, appointments: AppointmentRecord[]) {
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();

  return appointments.some((appointment) => {
    const appointmentStart = new Date(appointment.start_time).getTime();
    const appointmentEnd = new Date(appointment.end_time).getTime();
    return start < appointmentEnd && end > appointmentStart;
  });
}

function parseTime(value: string) {
  const [hour, minute] = value.slice(0, 5).split(":").map(Number);
  return [hour || 0, minute || 0] as const;
}

function getDatePartsInTimeZone(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  });

  const parts = formatter.formatToParts(date);
  const map = new Map(parts.map((part) => [part.type, part.value]));
  return {
    year: Number(map.get("year")),
    month: Number(map.get("month")),
    day: Number(map.get("day")),
    weekday: WEEKDAY_MAP[map.get("weekday") ?? "Sun"] ?? 0,
  };
}

function zonedDateTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string
) {
  const utcGuess = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));
  const offsetMs = getTimeZoneOffsetMs(utcGuess, timeZone);
  return new Date(utcGuess.getTime() - offsetMs);
}

function getTimeZoneOffsetMs(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const parts = formatter.formatToParts(date);
  const map = new Map(parts.map((part) => [part.type, part.value]));
  const asUtc = Date.UTC(
    Number(map.get("year")),
    Number(map.get("month")) - 1,
    Number(map.get("day")),
    Number(map.get("hour")),
    Number(map.get("minute")),
    Number(map.get("second"))
  );

  return asUtc - date.getTime();
}

function formatSlotLabel(startIso: string, timeZone: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(startIso));
}
