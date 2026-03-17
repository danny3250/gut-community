"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type AvailabilityRow = {
  id: string;
  day_of_week: number | null;
  weekday: number | null;
  start_local_time: string;
  end_local_time: string;
  timezone: string;
  slot_duration_minutes: number | null;
};

type AvailabilitySettingsManagerProps = {
  providerId: string;
  initialAvailability: AvailabilityRow[];
};

const DAY_OPTIONS = [
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
  { value: 0, label: "Sunday" },
];

const SLOT_OPTIONS = [15, 30, 45, 60];

export default function AvailabilitySettingsManager({
  providerId,
  initialAvailability,
}: AvailabilitySettingsManagerProps) {
  const supabase = createClient();
  const [availability, setAvailability] = useState(initialAvailability);
  const [dayOfWeek, setDayOfWeek] = useState("1");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");
  const [timezone, setTimezone] = useState("America/New_York");
  const [slotDuration, setSlotDuration] = useState("30");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function addAvailabilityWindow() {
    setSaving(true);
    setMessage(null);

    const payload = {
      provider_id: providerId,
      day_of_week: Number(dayOfWeek),
      weekday: Number(dayOfWeek),
      start_local_time: startTime,
      end_local_time: endTime,
      timezone,
      slot_duration_minutes: Number(slotDuration),
    };

    const { data, error } = await supabase
      .from("provider_availability_windows")
      .insert(payload)
      .select("id,day_of_week,weekday,start_local_time,end_local_time,timezone,slot_duration_minutes")
      .single();

    setSaving(false);

    if (error || !data) {
      setMessage(error?.message ?? "Could not save availability.");
      return;
    }

    setAvailability((current) =>
      [...current, data as AvailabilityRow].sort((a, b) => {
        const aDay = a.day_of_week ?? a.weekday ?? 0;
        const bDay = b.day_of_week ?? b.weekday ?? 0;
        return aDay - bDay || a.start_local_time.localeCompare(b.start_local_time);
      })
    );
    setMessage("Availability saved.");
  }

  async function removeAvailabilityWindow(id: string) {
    const { error } = await supabase.from("provider_availability_windows").delete().eq("id", id);
    if (error) {
      setMessage(error.message);
      return;
    }

    setAvailability((current) => current.filter((window) => window.id !== id));
    setMessage("Availability removed.");
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
      <section className="panel px-6 py-6 sm:px-8">
        <span className="eyebrow">Weekly availability</span>
        <h2 className="mt-4 text-2xl font-semibold">Set recurring working hours</h2>
        <p className="mt-3 text-sm leading-6 muted">
          These weekly windows are used to generate bookable appointment slots for patients.
        </p>

        <div className="mt-6 grid gap-4">
          <label className="text-sm">
            <div className="mb-2 font-medium">Day of week</div>
            <select className="field" value={dayOfWeek} onChange={(event) => setDayOfWeek(event.target.value)}>
              {DAY_OPTIONS.map((day) => (
                <option key={day.value} value={day.value}>
                  {day.label}
                </option>
              ))}
            </select>
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm">
              <div className="mb-2 font-medium">Start time</div>
              <input className="field" type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} />
            </label>
            <label className="text-sm">
              <div className="mb-2 font-medium">End time</div>
              <input className="field" type="time" value={endTime} onChange={(event) => setEndTime(event.target.value)} />
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm">
              <div className="mb-2 font-medium">Timezone</div>
              <input className="field" value={timezone} onChange={(event) => setTimezone(event.target.value)} />
            </label>
            <label className="text-sm">
              <div className="mb-2 font-medium">Slot duration</div>
              <select className="field" value={slotDuration} onChange={(event) => setSlotDuration(event.target.value)}>
                {SLOT_OPTIONS.map((minutes) => (
                  <option key={minutes} value={minutes}>
                    {minutes} minutes
                  </option>
                ))}
              </select>
            </label>
          </div>

          {message ? <div className="rounded-[22px] border border-[var(--border)] bg-white/72 px-4 py-3 text-sm">{message}</div> : null}

          <button type="button" className="btn-primary" disabled={saving} onClick={addAvailabilityWindow}>
            {saving ? "Saving..." : "Add availability window"}
          </button>
        </div>
      </section>

      <section className="panel px-6 py-6 sm:px-8">
        <span className="eyebrow">Current windows</span>
        <h2 className="mt-4 text-2xl font-semibold">Existing availability</h2>
        <div className="mt-5 grid gap-3">
          {availability.length === 0 ? (
            <div className="text-sm muted">No recurring availability has been set yet.</div>
          ) : (
            availability.map((window) => {
              const weekday = DAY_OPTIONS.find((day) => day.value === (window.day_of_week ?? window.weekday ?? 0));
              return (
                <div key={window.id} className="rounded-[24px] border border-[var(--border)] bg-white/72 px-4 py-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <div className="text-sm font-semibold">{weekday?.label ?? "Day"}</div>
                      <div className="mt-1 text-sm muted">
                        {window.start_local_time.slice(0, 5)} - {window.end_local_time.slice(0, 5)} · {window.timezone}
                      </div>
                      <div className="mt-1 text-xs muted">{window.slot_duration_minutes ?? 30} minute slots</div>
                    </div>
                    <button type="button" className="btn-secondary px-4 py-2 text-sm" onClick={() => removeAvailabilityWindow(window.id)}>
                      Delete
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}
