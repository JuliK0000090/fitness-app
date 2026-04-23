/**
 * Timezone-aware date helpers for per-user local-midnight rollover.
 * Uses native Intl.DateTimeFormat — no external dependency required.
 *
 * Prisma @db.Date fields are stored as UTC midnight (T00:00:00.000Z).
 * These helpers return Date objects in that same form.
 */

/**
 * Returns a Date representing midnight UTC for today in the given timezone.
 * e.g. for Tokyo (UTC+9) at 01:00 UTC, returns 2024-04-22T00:00:00.000Z (it's already Apr 22 in Tokyo).
 */
export function userToday(timezone: string): Date {
  const dateStr = localDateStr(new Date(), timezone);
  return new Date(dateStr + "T00:00:00.000Z");
}

/**
 * Returns a Date representing midnight UTC for yesterday in the given timezone.
 */
export function userYesterday(timezone: string): Date {
  const dateStr = localDateStr(new Date(), timezone);
  const d = new Date(dateStr + "T00:00:00.000Z");
  d.setUTCDate(d.getUTCDate() - 1);
  return d;
}

/**
 * Returns YYYY-MM-DD for today in the given timezone.
 */
export function userTodayStr(timezone: string): string {
  return localDateStr(new Date(), timezone);
}

/**
 * Returns the current hour (0–23) in the given timezone.
 */
export function userLocalHour(timezone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "numeric",
    hour12: false,
  }).formatToParts(new Date());
  const hour = parts.find((p) => p.type === "hour")?.value ?? "0";
  return parseInt(hour, 10) % 24;
}

// ── Internal ─────────────────────────────────────────────────────────────────

/** en-CA locale formats as YYYY-MM-DD, which is what we need. */
function localDateStr(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(date);
}
