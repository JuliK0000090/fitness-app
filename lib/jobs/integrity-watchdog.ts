/**
 * Integrity watchdog. Every 15 min:
 *
 *   1. Re-process any HaeRaw row stuck with processed=false for >5 min.
 *      The webhook now processes inline so this is mostly a backstop, but
 *      it covers the case where the webhook handler crashed mid-process
 *      or where Inngest re-delivery left a row in HaeRaw.processed=false.
 *
 *   2. For each user with HealthIntegration active, re-roll today's
 *      HaeDaily so the late-night accumulator (steps after 23:00) ends
 *      up reflected on the dashboard before the rollover job decides
 *      DONE/MISSED at 23:55.
 *
 * Idempotent. Reuses processHaeRawById and rollupDailyForDate, both of
 * which upsert.
 */

import { inngest } from "@/lib/inngest";
import { prisma } from "@/lib/prisma";
import { processHaeRawById, rollupDailyForDate } from "@/lib/health/process-hae";
import { userTodayStr } from "@/lib/time/today";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any;

const STUCK_AGE_MS = 5 * 60 * 1000;

export const integrityWatchdog = inngest.createFunction(
  {
    id: "integrity-watchdog",
    triggers: [{ cron: "*/15 * * * *" }],
  },
  async ({ step }) => {
    // ── 1. Re-process stuck raw payloads ────────────────────────────────────
    const reprocessed = await step.run("reprocess-stuck-raw", async () => {
      const stuck = await db.haeRaw.findMany({
        where: {
          processed: false,
          receivedAt: { lt: new Date(Date.now() - STUCK_AGE_MS) },
        },
        select: { id: true },
        take: 50,
      });
      let ok = 0;
      let failed = 0;
      for (const r of stuck) {
        try {
          await processHaeRawById(r.id);
          ok++;
        } catch (e) {
          failed++;
          console.error("[integrity-watchdog] reprocess failed:", r.id, e instanceof Error ? e.message : e);
        }
      }
      return { ok, failed };
    });

    // ── 2. Re-roll today's HaeDaily for active integrations ─────────────────
    const rolled = await step.run("reroll-today", async () => {
      const integrations = await prisma.healthIntegration.findMany({
        where: { active: true },
        select: { userId: true, user: { select: { timezone: true } } },
      });
      let ok = 0;
      let failed = 0;
      for (const { userId, user } of integrations) {
        const tz = user?.timezone || "UTC";
        try {
          await rollupDailyForDate(userId, userTodayStr(tz));
          ok++;
        } catch (e) {
          failed++;
          console.error("[integrity-watchdog] reroll failed:", userId, e instanceof Error ? e.message : e);
        }
      }
      return { ok, failed };
    });

    return { reprocessed, rolled };
  },
);

export const integrityWatchdogFunctions = [integrityWatchdog];
