import { toZonedTime } from "date-fns-tz";

/**
 * Parse a HAE date string like "2026-04-24 06:30:00 -0400" into a UTC Date.
 * Also handles ISO 8601 strings as a fallback.
 */
export function parseHaeDate(dateStr: string): Date {
  // HAE format: "2026-04-24 06:30:00 -0400" → "2026-04-24T06:30:00-04:00"
  const normalized = dateStr
    .replace(/^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2}) ([+-])(\d{2})(\d{2})$/, "$1T$2$3$4:$5")
    .replace(/^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2})$/, "$1T$2Z"); // no tz offset → assume UTC
  const d = new Date(normalized);
  if (isNaN(d.getTime())) throw new Error(`Cannot parse HAE date: ${dateStr}`);
  return d;
}

/**
 * Given a UTC Date, return the start-of-day in the user's local timezone as a UTC Date.
 * This is the value stored in HealthMetric.date (a @db.Date column treated as UTC midnight).
 */
export function dateInUserTz(utcDate: Date, timezone: string): Date {
  const zoned = toZonedTime(utcDate, timezone);
  const y = zoned.getFullYear();
  const m = String(zoned.getMonth() + 1).padStart(2, "0");
  const d = String(zoned.getDate()).padStart(2, "0");
  return new Date(`${y}-${m}-${d}T00:00:00.000Z`);
}
