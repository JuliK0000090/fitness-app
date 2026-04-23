/**
 * Timezone-aware date helpers for per-user local-midnight rollover.
 * Uses native Intl.DateTimeFormat — no external dependency required.
 */

/**
 * Returns a Date suitable for Prisma @db.Date queries representing today in the given timezone.
 * The date portion (YYYY-MM-DD) is what matters for @db.Date comparisons.
 */
export function userToday(timezone: string): Date {
  return new Date(userTodayStr(timezone) + "T00:00:00.000Z");
}

/**
 * Returns a Date suitable for Prisma @db.Date queries representing yesterday in the given timezone.
 */
export function userYesterday(timezone: string): Date {
  const d = userToday(timezone);
  d.setUTCDate(d.getUTCDate() - 1);
  return d;
}

/**
 * Returns YYYY-MM-DD for today in the given timezone.
 */
export function userTodayStr(timezone: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(new Date());
}

/**
 * Returns the UTC instant that corresponds to local midnight for `localDateStr` in `timezone`.
 *
 * Example: "2024-04-23" in "America/New_York" (EDT = UTC-4) → 2024-04-23T04:00:00.000Z
 *
 * Use this to filter `completedAt` timestamps to only include completions from today
 * in the user's local timezone, regardless of what date was stored in the @db.Date field.
 */
export function localMidnightUTC(localDateStr: string, timezone: string): Date {
  // Compute the UTC offset at noon of the target date (noon avoids DST boundary edge cases)
  const noonUTC = new Date(localDateStr + "T12:00:00.000Z");
  const offsetMinutes = getUTCOffsetMinutes(noonUTC, timezone);
  // UTC = Local - offsetMinutes (min)
  // → localMidnight in UTC = (local 00:00 expressed as UTC) - offsetMinutes
  // "local 00:00 expressed as UTC" is just treating the date string as UTC midnight:
  const baseMsUTC = new Date(localDateStr + "T00:00:00.000Z").getTime();
  return new Date(baseMsUTC - offsetMinutes * 60_000);
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

// ── Internal ──────────────────────────────────────────────────────────────────

/**
 * Returns (local_time_ms - utc_time_ms) / 60000 in minutes.
 * For EDT (UTC-4): returns -240. For JST (UTC+9): returns +540.
 */
function getUTCOffsetMinutes(date: Date, timezone: string): number {
  const fmt = (tz: string) =>
    new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
      hour12: false,
    }).formatToParts(date);

  const toParts = (parts: Intl.DateTimeFormatPart[]) =>
    Object.fromEntries(parts.map((p) => [p.type, p.value]));

  const utc = toParts(fmt("UTC"));
  const loc = toParts(fmt(timezone));

  const toMs = (p: Record<string, string>) =>
    new Date(`${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}Z`).getTime();

  return (toMs(loc) - toMs(utc)) / 60_000;
}
