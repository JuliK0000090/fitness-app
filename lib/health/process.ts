import { prisma } from "@/lib/prisma";
import { extractMetricsFromPayload } from "./normalize";
import { pickWinner, computeTrust } from ".";

export async function processHealthRaw(
  rawId: string,
  userId: string,
  provider: string,
  eventType: string,
  payload: Record<string, unknown>
) {
  const metrics = extractMetricsFromPayload(provider, eventType, payload);

  for (const { date, metric, value, unit } of metrics) {
    // Get all existing sources for this user+date+metric
    const existing = await prisma.healthDaily.findUnique({
      where: { userId_date_metric: { userId, date: new Date(date), metric } },
    });

    // Merge sources
    const sources: Record<string, number> = (existing?.sources as Record<string, number>) ?? {};
    sources[provider] = value;

    // Check for user override
    const override = await prisma.healthOverride.findUnique({
      where: { userId_date_metric: { userId, date: new Date(date), metric } },
    });

    let finalValue = value;
    let finalSource = provider;
    let overridden = false;

    if (override) {
      finalValue = override.value;
      finalSource = "MANUAL";
      overridden = true;
    } else {
      const winner = pickWinner(metric, sources);
      if (winner) {
        finalValue = winner.value;
        finalSource = winner.source;
      }
    }

    const trust = computeTrust({
      sourceCount: Object.keys(sources).length,
      isOverridden: overridden,
      isGapFilled: false,
    });

    await prisma.healthDaily.upsert({
      where: { userId_date_metric: { userId, date: new Date(date), metric } },
      create: {
        userId,
        date: new Date(date),
        metric,
        value: finalValue,
        unit,
        source: finalSource,
        sources: sources as object,
        trust,
        overridden,
      },
      update: {
        value: finalValue,
        source: finalSource,
        sources: sources as object,
        trust,
        overridden,
        computedAt: new Date(),
      },
    });
  }

  // Mark raw as processed (no-op update to confirm processing)
  await prisma.healthRaw.update({
    where: { id: rawId },
    data: {},
  }).catch(() => {});
}
