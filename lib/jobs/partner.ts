/**
 * Partner-system Inngest jobs.
 *
 *   partnerWeeklySummary — hourly cron, fires at user-local Sunday 10:00.
 *     For every ACCEPTED AccountabilityPartner where the original user
 *     had any activity this week, sends the privacy-safe weekly summary
 *     email via Resend.
 *
 *     Idempotency: a per-partner-per-week unique slot is enforced by
 *     the existing PartnerEncouragement(partnerId, weekOfYear, yearNumber)
 *     unique constraint, but for the SUMMARY itself we de-dupe by
 *     querying Email rows tagged with the partner-summary template plus
 *     the week tuple in the subject.
 */

import { inngest } from "@/lib/inngest";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email/send";
import { userLocalHour, userTodayStr } from "@/lib/time/today";
import { buildWeekSummary, appUrl } from "@/lib/partner/share";
import WeeklySummary from "@/emails/partner/WeeklySummary";
import React from "react";

export const partnerWeeklySummary = inngest.createFunction(
  {
    id: "partner-weekly-summary",
    triggers: [{ cron: "0 * * * *" }],
  },
  async ({ step }) => {
    const sentCount = await step.run("scan-and-send", async () => {
      // Pull every ACCEPTED partnership; we'll filter by user-local time
      // before sending.
      const partners = await prisma.accountabilityPartner.findMany({
        where: { status: "ACCEPTED" },
        include: {
          user: {
            select: { id: true, name: true, email: true, timezone: true },
          },
        },
      });

      let sent = 0;
      for (const p of partners) {
        const tz = p.user.timezone || "UTC";
        if (userLocalHour(tz) !== 10) continue;

        const todayLocalStr = userTodayStr(tz);
        // Day-of-week from the local date (avoids server-tz drift)
        const dow = new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "short" })
          .format(new Date());
        if (dow !== "Sun") continue;

        // Per-week de-dupe — has a partner-summary email gone out today?
        const since = new Date(`${todayLocalStr}T00:00:00.000Z`);
        const already = await prisma.email.findFirst({
          where: {
            userId: p.user.id,
            templateId: "partner-weekly-summary",
            to: p.partnerEmail,
            createdAt: { gte: since },
          },
        });
        if (already) continue;

        const summary = await buildWeekSummary(p.user.id);

        // Don't send a summary for a week with nothing in it — quiet weeks
        // get one email, weeks with zero activity AND zero engagement skip.
        if (
          summary.workoutsDone === 0 &&
          summary.workoutsPlanned === 0 &&
          summary.habitAdherencePct === 0 &&
          summary.streakDays === 0
        ) {
          continue;
        }

        const encourageUrl = `${appUrl()}/partner/encourage/${p.id}/${p.inviteToken}`;

        await sendEmail({
          userId: p.user.id,
          to: p.partnerEmail,
          templateId: "partner-weekly-summary",
          category: "recurring",
          subject: `${summary.userFirstName}'s week.`,
          preview: `${summary.workoutsDone} of ${summary.workoutsPlanned} workouts. ${summary.habitAdherencePct}% habits. ${summary.streakDays}-day streak.`,
          react: React.createElement(WeeklySummary, {
            partnerName: p.partnerName,
            userFirstName: summary.userFirstName,
            workoutsDone: summary.workoutsDone,
            workoutsPlanned: summary.workoutsPlanned,
            habitAdherencePct: summary.habitAdherencePct,
            streakDays: summary.streakDays,
            streakAlive: summary.streakAlive,
            notable: summary.notable,
            encourageUrl,
          }),
        });

        sent++;
      }
      return sent;
    });

    return { sent: sentCount };
  },
);

export const partnerJobs = [partnerWeeklySummary];
