import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";
import { prisma } from "@/lib/prisma";

// Verify Terra webhook signature
function verifySignature(body: string, signature: string, secret: string): boolean {
  const expected = createHmac("sha256", secret).update(body).digest("hex");
  // Terra may send as "sha256=<hex>" or just "<hex>"
  const sig = signature.startsWith("sha256=") ? signature.slice(7) : signature;
  return expected === sig;
}

// Extract a YYYY-MM-DD date string from a Terra timestamp or date field
function toDateString(value: unknown): string {
  if (typeof value === "string") {
    return value.split("T")[0];
  }
  return new Date().toISOString().split("T")[0];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseTerraData(event: Record<string, any>) {
  // Terra activity/daily/sleep/body payloads have a `data` array
  const entries: Array<{
    date: string;
    steps?: number;
    activeMinutes?: number;
    caloriesBurned?: number;
    hrAvg?: number;
    hrMax?: number;
    hrMin?: number;
    hrResting?: number;
    hrv?: number;
    sleepDuration?: number;
    sleepEfficiency?: number;
    bodyTempDelta?: number;
    readinessScore?: number;
    recoveryScore?: number;
  }> = [];

  const dataItems = Array.isArray(event.data) ? event.data : [];

  for (const item of dataItems) {
    const date = toDateString(item.metadata?.start_time ?? item.date ?? undefined);

    const entry: (typeof entries)[number] = { date };

    // Activity / Daily
    if (item.distance_data) {
      entry.steps = item.distance_data.steps ?? undefined;
    }
    if (item.active_durations_data) {
      const mins = item.active_durations_data.activity_seconds != null
        ? Math.round(item.active_durations_data.activity_seconds / 60)
        : undefined;
      entry.activeMinutes = mins;
    }
    if (item.calories_data) {
      entry.caloriesBurned = item.calories_data.total_burned_calories ?? undefined;
    }
    if (item.heart_rate_data?.summary) {
      const hr = item.heart_rate_data.summary;
      entry.hrAvg = hr.avg_hr_bpm ?? undefined;
      entry.hrMax = hr.max_hr_bpm ?? undefined;
      entry.hrMin = hr.min_hr_bpm ?? undefined;
      entry.hrResting = hr.resting_hr_bpm ?? undefined;
    }
    if (item.hrv_data?.summary) {
      entry.hrv = item.hrv_data.summary.avg_sdnn ?? item.hrv_data.summary.avg_rmssd ?? undefined;
    }

    // Sleep
    if (item.sleep_durations_data?.sleep_efficiency) {
      entry.sleepEfficiency = item.sleep_durations_data.sleep_efficiency;
    }
    if (item.sleep_durations_data?.asleep?.duration_asleep_state_seconds != null) {
      entry.sleepDuration = Math.round(item.sleep_durations_data.asleep.duration_asleep_state_seconds / 60);
    }

    // Body
    if (item.temperature_data?.body_temperature_delta != null) {
      entry.bodyTempDelta = item.temperature_data.body_temperature_delta;
    }

    // Readiness / Recovery (Oura / WHOOP)
    if (item.readiness_data?.readiness_score != null) {
      entry.readinessScore = item.readiness_data.readiness_score;
    }
    if (item.strain_data?.strain_level != null) {
      entry.recoveryScore = item.strain_data.strain_level;
    }

    entries.push(entry);
  }

  return entries;
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  // Validate signature if secret is configured
  const secret = process.env.TERRA_WEBHOOK_SECRET;
  if (secret) {
    const sig = req.headers.get("terra-signature") ?? "";
    if (!verifySignature(rawBody, sig, secret)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  }

  let event: Record<string, unknown>;
  try {
    event = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: true }); // Ignore malformed payloads
  }

  const eventType = event.type as string | undefined;

  if (eventType === "user_auth_success") {
    const user = event.user as Record<string, string> | undefined;
    if (user?.user_id && user?.provider && user?.reference_id) {
      prisma.device.upsert({
        where: { userId_provider: { userId: user.reference_id, provider: user.provider } },
        create: {
          userId: user.reference_id,
          provider: user.provider,
          terraUserId: user.user_id,
          connected: true,
          connectedAt: new Date(),
        },
        update: {
          terraUserId: user.user_id,
          connected: true,
          connectedAt: new Date(),
        },
      }).catch(() => {});
    }
  } else if (eventType === "user_deauth") {
    const user = event.user as Record<string, string> | undefined;
    if (user?.user_id) {
      prisma.device.updateMany({
        where: { terraUserId: user.user_id },
        data: { connected: false },
      }).catch(() => {});
    }
  } else if (
    eventType === "activity" ||
    eventType === "daily" ||
    eventType === "sleep" ||
    eventType === "body"
  ) {
    const user = event.user as Record<string, string> | undefined;
    if (user?.user_id) {
      // We don't await this — keep the webhook fast
      (async () => {
        const device = await prisma.device.findFirst({
          where: { terraUserId: user.user_id },
          select: { id: true },
        });
        if (!device) return;

        const entries = parseTerraData(event as Record<string, unknown>);

        for (const entry of entries) {
          const { date, ...metrics } = entry;
          await prisma.deviceData.upsert({
            where: { deviceId_date: { deviceId: device.id, date } },
            create: { deviceId: device.id, date, ...metrics, rawJson: JSON.stringify(event) },
            update: { ...metrics, rawJson: JSON.stringify(event) },
          }).catch(() => {});
        }

        // Update lastSyncAt
        await prisma.device.update({
          where: { id: device.id },
          data: { lastSyncAt: new Date() },
        }).catch(() => {});
      })().catch(() => {});
    }
  }

  return NextResponse.json({ ok: true });
}
