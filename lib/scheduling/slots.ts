export type AvailabilityWindow = {
  startIso: string;
  endIso: string;
  slotMinutes: number;
  bufferMinutes?: number;
};

export type GeneratedSlot = {
  startIso: string;
  endIso: string;
  timezone: string;
};

export function generateTimeSlots(
  window: AvailabilityWindow,
  timezone: string
): GeneratedSlot[] {
  const start = new Date(window.startIso);
  const end = new Date(window.endIso);
  const slotMs = window.slotMinutes * 60 * 1000;
  const bufferMs = (window.bufferMinutes ?? 0) * 60 * 1000;

  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || slotMs <= 0) {
    return [];
  }

  const slots: GeneratedSlot[] = [];
  let cursor = start.getTime();

  while (cursor + slotMs <= end.getTime()) {
    slots.push({
      startIso: new Date(cursor).toISOString(),
      endIso: new Date(cursor + slotMs).toISOString(),
      timezone,
    });
    cursor += slotMs + bufferMs;
  }

  return slots;
}
