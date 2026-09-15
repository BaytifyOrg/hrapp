// Interview availability: Monday–Thursday, 11am–3pm Dubai time.
// Dubai is fixed at UTC+4 year-round (no DST), which keeps this arithmetic simple:
// "11:00 Dubai" on a given calendar day is always "07:00 UTC" that same day, etc.
const START_HOUR_DUBAI = 11;
const END_HOUR_DUBAI = 15;
const SLOT_MINUTES = 30;
const DUBAI_OFFSET_HOURS = 4;

function dubaiDateParts(date: Date) {
  const shifted = new Date(date.getTime() + DUBAI_OFFSET_HOURS * 60 * 60 * 1000);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth(),
    day: shifted.getUTCDate(),
    weekday: shifted.getUTCDay(), // 0 = Sunday ... 6 = Saturday
  };
}

export function generateAvailableSlots(bookedIsoTimes: Set<string>, maxSlots = 40): string[] {
  const slots: string[] = [];
  const now = new Date();
  const minBookableTime = now.getTime() + 2 * 60 * 60 * 1000; // at least 2 hours' notice

  for (let dayOffset = 1; dayOffset <= 21 && slots.length < maxSlots; dayOffset++) {
    const candidateDay = new Date(now.getTime() + dayOffset * 24 * 60 * 60 * 1000);
    const { year, month, day, weekday } = dubaiDateParts(candidateDay);
    if (weekday < 1 || weekday > 4) continue; // only Monday(1)–Thursday(4)

    for (let hour = START_HOUR_DUBAI; hour < END_HOUR_DUBAI; hour++) {
      for (let minute = 0; minute < 60; minute += SLOT_MINUTES) {
        const utcHour = hour - DUBAI_OFFSET_HOURS;
        const slotDate = new Date(Date.UTC(year, month, day, utcHour, minute));
        if (slotDate.getTime() < minBookableTime) continue;
        const iso = slotDate.toISOString();
        if (!bookedIsoTimes.has(iso)) slots.push(iso);
      }
    }
  }

  return slots.slice(0, maxSlots);
}
