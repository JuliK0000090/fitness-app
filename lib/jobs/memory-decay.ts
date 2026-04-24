/**
 * Memory confidence decay job
 *
 * Weekly cron: decays UserFact.confidence by 5% per week for facts
 * not confirmed in the last 30 days. Marks facts with confidence < 0.4 as stale
 * (they will be surfaced as needing re-confirmation in system prompt).
 */

import { inngest } from "@/lib/inngest";
import { prisma } from "@/lib/prisma";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any;

export const decayMemoryConfidence = inngest.createFunction(
  {
    id: "memory-confidence-decay",
    triggers: [{ cron: "0 3 * * 0" }], // Sunday 3 AM UTC weekly
  },
  async ({ step }: { step: { run: <T>(id: string, fn: () => Promise<T>) => Promise<T> } }) => {
    await step.run("decay-confidence", async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Find all facts not confirmed in last 30 days
      const staleFacts = await db.userFact.findMany({
        where: {
          active: true,
          lastConfirmedAt: { lt: thirtyDaysAgo },
        },
        select: { id: true, confidence: true },
      });

      if (staleFacts.length === 0) return { decayed: 0 };

      // Decay confidence by 5% per week, minimum 0.1
      let decayed = 0;
      for (const fact of staleFacts as Array<{ id: string; confidence: number }>) {
        const newConfidence = Math.max(0.1, fact.confidence * 0.95);
        await db.userFact.update({
          where: { id: fact.id },
          data: { confidence: newConfidence },
        });
        decayed++;
      }

      return { decayed };
    });
  }
);
