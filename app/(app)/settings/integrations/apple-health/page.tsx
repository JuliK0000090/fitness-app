import { requireSession } from "@/lib/auth";
import { getOrCreateIntegration } from "@/lib/health/token";
import { prisma } from "@/lib/prisma";
import { AppleHealthSetup } from "./setup";
import QRCode from "qrcode";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any;

const ORIGIN =
  process.env.NEXT_PUBLIC_APP_URL ??
  "https://fitness-app-production-2ef2.up.railway.app";

export default async function AppleHealthPage() {
  const session = await requireSession();
  const userId = session.userId;

  const integration = await getOrCreateIntegration(userId);
  const webhookUrl = `${ORIGIN}/api/webhooks/hae/${integration.webhookToken}`;

  const [daysOfHistory, qrCodeDataUrl, wearableHabits] = await Promise.all([
    db.haeDaily.count({ where: { userId } }),
    QRCode.toDataURL(webhookUrl, { width: 200, margin: 1 }),
    prisma.habit.findMany({
      where: {
        userId,
        active: true,
        trackingMode: { in: ["WEARABLE_AUTO", "HYBRID"] },
      },
      select: { id: true, title: true, metricKey: true, metricTarget: true, metricComparison: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  return (
    <AppleHealthSetup
      webhookUrl={webhookUrl}
      qrCodeDataUrl={qrCodeDataUrl}
      lastPayloadAt={integration.lastPayloadAt?.toISOString() ?? null}
      totalPayloadCount={integration.totalPayloadCount ?? 0}
      daysOfHistory={daysOfHistory}
      active={integration.active}
      wearableHabits={wearableHabits.map((h) => ({
        id: h.id,
        title: h.title ?? "",
        metricKey: h.metricKey,
        metricTarget: h.metricTarget,
        metricComparison: h.metricComparison,
      }))}
    />
  );
}
