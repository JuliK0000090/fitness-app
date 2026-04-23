import { prisma } from "./prisma";

interface RateLimitResult {
  ok: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * DB-based rate limiter — works correctly across serverless instances and
 * multiple Railway workers. Uses the AuditLog table to count events within a
 * sliding window.
 *
 * Falls back to allowing the request if the DB query itself fails (fail-open),
 * so a DB outage doesn't lock out all users.
 */
export async function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<RateLimitResult> {
  const now = Date.now();
  const windowStart = new Date(now - windowMs);
  const resetAt = now + windowMs;

  try {
    // Count recent rate-limit hits for this key
    const count = await prisma.auditLog.count({
      where: {
        action: "rate_limit_hit",
        entityType: "rate_limit",
        entityId: key,
        createdAt: { gte: windowStart },
      },
    });

    if (count >= limit) {
      return { ok: false, remaining: 0, resetAt };
    }

    // Record this hit
    await prisma.auditLog.create({
      data: {
        userId: key.split(":")[1] ?? "unknown",
        action: "rate_limit_hit",
        entityType: "rate_limit",
        entityId: key,
      },
    });

    return { ok: true, remaining: limit - count - 1, resetAt };
  } catch (e) {
    // Fail-open: if DB is unreachable, allow the request rather than blocking all users
    console.error("[rate-limit] DB error, failing open:", e);
    return { ok: true, remaining: 1, resetAt };
  }
}
