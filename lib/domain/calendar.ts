/** Planning deadlines use India Standard Time on every host; event clocks remain venue-local. */
const planningDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Kolkata",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function planningDate(now = new Date()): string {
  const parts = { year: "", month: "", day: "" };
  for (const part of planningDateFormatter.formatToParts(now))
    if (part.type === "year" || part.type === "month" || part.type === "day")
      parts[part.type] = part.value;
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function parseDate(date: string): Date {
  return new Date(`${date}T00:00:00Z`);
}

export function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

export function milestoneDueDate(
  eventDate: string | null,
  offset: number,
  earliestDate = planningDate(),
): string | null {
  if (!eventDate) return null;
  const requested = formatDate(addDays(parseDate(eventDate), offset));
  return requested < earliestDate ? earliestDate : requested;
}
