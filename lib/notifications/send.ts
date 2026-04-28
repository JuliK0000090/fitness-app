/**
 * Category-aware push notification send service.
 *
 * Every push that goes to a user funnels through send(). It enforces:
 *
 *   1. NotificationPreference category toggle (lazily creates the row
 *      with restrained defaults on first call)
 *   2. Quiet hours (per-user-tz) — sends are deferred during the user's
 *      sleep window. ESSENTIAL category bypasses; nothing in Track A is
 *      essential.
 *   3. Throttle — a user can receive at most 2 push notifications per
 *      24h on average. Beyond that, only ESSENTIAL pushes proceed.
 *   4. NotificationLog audit — every send attempt logs (sent or skipped
 *      with skipReason) so /admin can surface delivery health.
 *
 * Calibrated to the existing schema:
 *   - PushSubscription has the same shape as the /api/push/subscribe
 *     endpoint produces (endpoint + p256dh + auth).
 *   - VAPID keys are read at first-use; if missing, send() resolves with
 *     `{ skipped: true, reason: "vapid-not-configured" }` instead of
 *     crashing the caller. The Inngest job logs this.
 */

import webpush from "web-push";
import { prisma } from "@/lib/prisma";
import { userLocalHour } from "@/lib/time/today";

export type NotificationCategory =
  | "preWorkout"
  | "streakSave"
  | "weeklyReview"
  | "reactiveAdjustment"
  | "partnerEncouragement";

const RESTRAINED_DAILY_LIMIT = 2;
const ESSENTIAL_CATEGORIES = new Set<NotificationCategory>([
  // Track A keeps everything restrained — no category bypasses quiet hours.
]);

let vapidConfigured = false;
function ensureVapid(): boolean {
  if (vapidConfigured) return true;
  const publicKey = process.env.VAPID_PUBLIC_KEY ?? process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT ?? "mailto:admin@vita.app";
  if (!publicKey || !privateKey) return false;
  webpush.setVapidDetails(subject, publicKey, privateKey);
  vapidConfigured = true;
  return true;
}

async function getOrCreatePrefs(userId: string) {
  const existing = await prisma.notificationPreference.findUnique({
    where: { userId },
  });
  if (existing) return existing;
  return prisma.notificationPreference.create({ data: { userId } });
}

/**
 * Quiet-hours check using HH:MM strings interpreted in the user's timezone.
 * Handles overnight windows (22:00 → 07:00 wraps midnight).
 */
function isInQuietHours(start: string, end: string, tz: string): boolean {
  const hour = userLocalHour(tz);
  const [sH] = start.split(":").map(Number);
  const [eH] = end.split(":").map(Number);
  if (Number.isNaN(sH) || Number.isNaN(eH)) return false;
  // Window wraps midnight: e.g. 22 → 07 means hour >= 22 OR hour < 7
  if (sH > eH) return hour >= sH || hour < eH;
  // Same-day window: 13 → 17 means 13 <= hour < 17
  return hour >= sH && hour < eH;
}

async function recentNotificationCount(userId: string): Promise<number> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  return prisma.notificationLog.count({
    where: { userId, sentAt: { gte: since }, delivered: true },
  });
}

export type SendInput = {
  userId: string;
  category: NotificationCategory;
  title: string;
  body: string;
  deepLink?: string;
  /** If true, skip throttle + quiet-hours. Track A doesn't use this. */
  essential?: boolean;
};

export type SendOutcome =
  | { sent: true; deliveredCount: number; logId: string }
  | { sent: false; reason: string; logId: string };

/**
 * Send a push notification to one user, respecting their preferences,
 * quiet hours, and the daily restraint cap. Records every attempt to
 * NotificationLog with `delivered` and `skipReason`.
 */
export async function send(input: SendInput): Promise<SendOutcome> {
  const { userId, category, title, body, deepLink } = input;
  const essential = input.essential ?? ESSENTIAL_CATEGORIES.has(category);

  async function logAndReturn(opts: { delivered: boolean; reason?: string }): Promise<SendOutcome> {
    const log = await prisma.notificationLog.create({
      data: {
        userId, category, title, body,
        deepLink: deepLink ?? null,
        delivered: opts.delivered,
        skipReason: opts.reason ?? null,
      },
    });
    return opts.delivered
      ? { sent: true, deliveredCount: 0, logId: log.id }
      : { sent: false, reason: opts.reason ?? "unknown", logId: log.id };
  }

  // 1. Preference check
  const prefs = await getOrCreatePrefs(userId);
  const enabled = prefs[category as keyof typeof prefs];
  if (!enabled) return logAndReturn({ delivered: false, reason: "category-disabled" });

  // 2. Quiet hours
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { timezone: true },
  });
  const tz = user?.timezone ?? "UTC";
  if (!essential && isInQuietHours(prefs.quietHoursStart, prefs.quietHoursEnd, tz)) {
    return logAndReturn({ delivered: false, reason: "quiet-hours" });
  }

  // 3. Throttle
  if (!essential) {
    const recent = await recentNotificationCount(userId);
    if (recent >= RESTRAINED_DAILY_LIMIT) {
      return logAndReturn({ delivered: false, reason: "daily-limit-reached" });
    }
  }

  // 4. VAPID + delivery
  if (!ensureVapid()) {
    return logAndReturn({ delivered: false, reason: "vapid-not-configured" });
  }

  const subs = await prisma.pushSubscription.findMany({ where: { userId } });
  if (subs.length === 0) {
    return logAndReturn({ delivered: false, reason: "no-subscriptions" });
  }

  const payload = JSON.stringify({
    title,
    body,
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    deepLink: deepLink ?? "/today",
  });

  let delivered = 0;
  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload,
      );
      delivered++;
    } catch (e: unknown) {
      const status =
        typeof e === "object" && e !== null && "statusCode" in e
          ? (e as { statusCode: number }).statusCode
          : null;
      if (status === 404 || status === 410) {
        // Subscription is dead (browser uninstalled / user revoked) — clean up.
        await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
      } else {
        console.error("[notifications] send failed:", e);
      }
    }
  }

  const log = await prisma.notificationLog.create({
    data: {
      userId, category, title, body,
      deepLink: deepLink ?? null,
      delivered: delivered > 0,
      skipReason: delivered === 0 ? "all-subscriptions-failed" : null,
    },
  });

  return delivered > 0
    ? { sent: true, deliveredCount: delivered, logId: log.id }
    : { sent: false, reason: "all-subscriptions-failed", logId: log.id };
}

/** Public VAPID key for the browser to use during PushManager.subscribe. */
export function publicVapidKey(): string | null {
  return process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? process.env.VAPID_PUBLIC_KEY ?? null;
}
