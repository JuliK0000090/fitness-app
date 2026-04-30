/**
 * Dashboard background jobs.
 *
 *   generateMorningHeadlines — hourly cron. For every active user whose
 *     local time is 06:00–07:30 we call ensureTodayHeadline so /today
 *     shows a freshly-written narrative when the user opens the app.
 */

import { inngest } from "@/lib/inngest";
import { prisma } from "@/lib/prisma";
import { ensureTodayHeadline } from "@/lib/dashboard/headline";
import { userLocalHour } from "@/lib/time/today";

export const generateMorningHeadlines = inngest.createFunction(
  {
    id: "dashboard-generate-morning-headlines",
    triggers: [{ cron: "0 * * * *" }],
  },
  async ({ step }) => {
    const generated = await step.run("scan-and-generate", async () => {
      const users = await prisma.user.findMany({
        where: { deletedAt: null, onboardingComplete: true },
        select: { id: true, timezone: true },
      });
      let count = 0;
      for (const u of users) {
        const tz = u.timezone ?? "UTC";
        const hour = userLocalHour(tz);
        // 06:00–07:59 covers the hourly cron jitter — we'll still skip if
        // ensureTodayHeadline finds an existing row.
        if (hour < 6 || hour > 7) continue;
        try {
          const result = await ensureTodayHeadline(u.id);
          if (result.generated) count++;
        } catch (e) {
          console.error("[dashboard] morning headline failed:", u.id, e instanceof Error ? e.message : e);
        }
      }
      return count;
    });
    return { generated };
  },
);

export const dashboardFunctions = [generateMorningHeadlines];
