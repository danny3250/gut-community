import type { SupabaseClient } from "@supabase/supabase-js";
import { AppointmentRecord, ProviderAvailabilityRecord, ProviderTimeBlockRecord } from "@/lib/carebridge/types";
import { fetchProviderAvailability } from "@/lib/carebridge/providers";
import { fetchPublicBookedSlotsForProvider } from "@/lib/carebridge/appointments";
import { generateTimeSlots } from "@/lib/scheduling/slots";

export type BookableSlot = {
  startIso: string;
  endIso: string;
  timezone: string;
  dateKey: string;
  dateLabel: string;
  timeLabel: string;
  label: string;
};

export type ProviderCalendarDay = {
  dateKey: string;
  dateLabel: string;
  appointments: AppointmentRecord[];
  timeBlocks: ProviderTimeBlockRecord[];
  openSlots: BookableSlot[];
};

type SchedulingOptions = {
  publicView?: boolean;
  defaultSlotMinutes?: number;
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

export async function generateSlotsForDay(
  supabase: SupabaseClient,
  providerId: string,
  date: Date,
  options: SchedulingOptions = {}
) {
  const [availability, appointments, timeBlocks] = await Promise.all([
    fetchProviderAvailability(supabase, providerId),
    fetchAppointmentsForRange(supabase, providerId, startOfUtcDay(date).toISOString(), endOfUtcDay(date).toISOString(), options),
    fetchProviderTimeBlocks(supabase, providerId, startOfUtcDay(date).toISOString(), endOfUtcDay(date).toISOString(), options.publicView),
  ]);

  return buildSlotsForDate(
    availability,
    appointments,
    timeBlocks,
    date,
    options.defaultSlotMinutes
  );
}

export async function getAvailableSlots(
  supabase: SupabaseClient,
  providerId: string,
  date: Date,
  options: SchedulingOptions = {}
) {
  return generateSlotsForDay(supabase, providerId, date, options);
}

export async function getProviderCalendar(
  supabase: SupabaseClient,
  providerId: string,
  startDate: Date,
  endDate: Date,
  options: SchedulingOptions = {}
) {
  const [availability, appointments, timeBlocks] = await Promise.all([
    fetchProviderAvailability(supabase, providerId),
    fetchAppointmentsForRange(supabase, providerId, startDate.toISOString(), endDate.toISOString(), options),
    fetchProviderTimeBlocks(supabase, providerId, startDate.toISOString(), endDate.toISOString(), options.publicView),
  ]);

  const days: ProviderCalendarDay[] = [];
  for (const date of eachDayInRange(startDate, endDate)) {
    days.push({
      dateKey: formatDateKey(date),
      dateLabel: new Intl.DateTimeFormat("en-US", {
        weekday: "long",
        month: "short",
        day: "numeric",
      }).format(date),
      appointments: appointments.filter((appointment) => formatDateKey(new Date(appointment.start_time)) === formatDateKey(date)),
      timeBlocks: timeBlocks.filter((block) => intersectsDay(block, date)),
      openSlots: buildSlotsForDate(availability, appointments, timeBlocks, date, options.defaultSlotMinutes),
    });
  }

  return days;
}

export async function fetchProviderTimeBlocks(
  supabase: SupabaseClient,
  providerId: string,
  fromIso?: string,
  toIso?: string,
  publicView = false
) {
  if (publicView) {
    const { data, error } = await supabase.rpc("get_public_provider_time_blocks", {
      target_provider_id: providerId,
      from_iso: fromIso ?? null,
      to_iso: toIso ?? null,
    });

    if (error) throw error;
    return (data ?? []) as ProviderTimeBlockRecord[];
  }

  let query = supabase
    .from("provider_time_blocks")
    .select("id,provider_id,start_time,end_time,reason,created_at,updated_at")
    .eq("provider_id", providerId)
    .order("start_time", { ascending: true });

  if (fromIso) query = query.gt("end_time", fromIso);
  if (toIso) query = query.lt("start_time", toIso);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as ProviderTimeBlockRecord[];
}

function buildSlotsForDate(
  windows: ProviderAvailabilityRecord[],
  appointments: AppointmentRecord[],
  timeBlocks: ProviderTimeBlockRecord[],
  date: Date,
  defaultSlotMinutes = 30
) {
  const slots: BookableSlot[] = [];

  for (const window of windows) {
    const windowWeekday = window.day_of_week ?? window.weekday ?? 0;
    const localDateParts = getDatePartsInTimeZone(date, window.timezone);
    if (localDateParts.weekday !== windowWeekday) continue;

    const [startHour, startMinute] = parseTime(window.start_local_time);
    const [endHour, endMinute] = parseTime(window.end_local_time);
    const slotMinutes = window.slot_duration_minutes ?? defaultSlotMinutes;

    const windowStart = zonedDateTimeToUtc(
      localDateParts.year,
      localDateParts.month,
      localDateParts.day,
      startHour,
      startMinute,
      window.timezone
    );
    const windowEnd = zonedDateTimeToUtc(
      localDateParts.year,
      localDateParts.month,
      localDateParts.day,
      endHour,
      endMinute,
      window.timezone
    );

    const generated = generateTimeSlots(
      {
        startIso: windowStart.toISOString(),
        endIso: windowEnd.toISOString(),
        slotMinutes,
      },
      window.timezone
    );

    for (const slot of generated) {
      if (new Date(slot.startIso) <= new Date()) continue;
      if (hasConflict(slot.startIso, slot.endIso, appointments, timeBlocks)) continue;

      slots.push({
        startIso: slot.startIso,
        endIso: slot.endIso,
        timezone: slot.timezone,
        dateKey: formatDateKey(new Date(slot.startIso)),
        dateLabel: new Intl.DateTimeFormat("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
          timeZone: slot.timezone,
        }).format(new Date(slot.startIso)),
        timeLabel: new Intl.DateTimeFormat("en-US", {
          hour: "numeric",
          minute: "2-digit",
          timeZone: slot.timezone,
        }).format(new Date(slot.startIso)),
        label: new Intl.DateTimeFormat("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
          timeZone: slot.timezone,
        }).format(new Date(slot.startIso)),
      });
    }
  }

  return slots.sort((a, b) => a.startIso.localeCompare(b.startIso));
}

async function fetchAppointmentsForRange(
  supabase: SupabaseClient,
  providerId: string,
  fromIso: string,
  toIso: string,
  options: SchedulingOptions
) {
  if (options.publicView) {
    const rows = await fetchPublicBookedSlotsForProvider(supabase, providerId, fromIso);
    return rows.filter((row) => row.start_time < toIso);
  }

  const { data, error } = await supabase
    .from("appointments")
    .select("id,provider_id,patient_id,organization_id,status,appointment_type,start_time,end_time,timezone,visit_vendor,visit_external_id,join_url_placeholder")
    .eq("provider_id", providerId)
    .lt("start_time", toIso)
    .gt("end_time", fromIso)
    .order("start_time", { ascending: true });

  if (error) throw error;
  return (data ?? []) as AppointmentRecord[];
}

function hasConflict(
  startIso: string,
  endIso: string,
  appointments: AppointmentRecord[],
  timeBlocks: ProviderTimeBlockRecord[]
) {
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();

  const appointmentConflict = appointments
    .filter((appointment) => appointment.status === "requested" || appointment.status === "confirmed")
    .some((appointment) => {
      const appointmentStart = new Date(appointment.start_time).getTime();
      const appointmentEnd = new Date(appointment.end_time).getTime();
      return start < appointmentEnd && end > appointmentStart;
    });

  if (appointmentConflict) return true;

  return timeBlocks.some((block) => {
    const blockStart = new Date(block.start_time).getTime();
    const blockEnd = new Date(block.end_time).getTime();
    return start < blockEnd && end > blockStart;
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

function eachDayInRange(startDate: Date, endDate: Date) {
  const days: Date[] = [];
  const cursor = startOfUtcDay(startDate);
  const end = startOfUtcDay(endDate);

  while (cursor <= end) {
    days.push(new Date(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return days;
}

function intersectsDay(block: ProviderTimeBlockRecord, date: Date) {
  const start = startOfUtcDay(date).getTime();
  const end = endOfUtcDay(date).getTime();
  return new Date(block.start_time).getTime() < end && new Date(block.end_time).getTime() > start;
}

function startOfUtcDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0));
}

function endOfUtcDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59, 999));
}

export function formatDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}
