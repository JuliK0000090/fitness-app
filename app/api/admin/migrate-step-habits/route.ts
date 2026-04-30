/**
 * One-shot admin endpoint: convert existing manual "X steps" / "Y h sleep"
 * habits into wearable-tracked habits for any user with an active
 * HealthIntegration.
 *
 *   GET /api/admin/migrate-step-habits           → dry-run, returns plan
 *   GET /api/admin/migrate-step-habits?confirm=1 → applies
 *
 * Idempotent. Same inference rules as scripts/migrate-existing-step-habits.ts.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? "juliana.kolarski@gmail.com")
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

type Inferred = { metricKey: string; metricTarget: number; metricComparison: "GTE" };

function inferFromTitle(title: string | null): Inferred | null {
  if (!title) return null;
  const t = title.toLowerCase();

  const stepsMatch = t.match(/([\d,]+)\s*k?\s*steps/);
  if (stepsMatch) {
    let n = parseInt(stepsMatch[1].replace(/,/g, ""), 10);
    if (/k\s*steps/.test(t) && n < 100) n *= 1000;
    if (Number.isFinite(n) && n > 0) {
      return { metricKey: "steps", metricTarget: n, metricComparison: "GTE" };
    }
  }

  const sleepMatch = t.match(/(\d+(?:\.\d+)?)\s*h(?:ours?)?\s*sleep/);
  if (sleepMatch) {
    const n = parseFloat(sleepMatch[1]);
    if (Number.isFinite(n) && n > 0) {
      return { metricKey: "sleepHours", metricTarget: n, metricComparison: "GTE" };
    }
  }

  const activeMatch = t.match(/(\d+)\s*(?:active\s*minutes?|minutes?\s*active)/);
  if (activeMatch) {
    const n = parseInt(activeMatch[1], 10);
    if (Number.isFinite(n) && n > 0) {
      return { metricKey: "activeMinutes", metricTarget: n, metricComparison: "GTE" };
    }
  }

  return null;
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const me = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { email: true },
  });
  if (!me || !ADMIN_EMAILS.includes(me.email.toLowerCase())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const apply = req.nextUrl.searchParams.get("confirm") === "1";

  const integrations = await prisma.healthIntegration.findMany({
    where: { active: true },
    select: { userId: true, user: { select: { email: true } } },
  });
  const userIds = integrations.map((i) => i.userId);
  const emailById = new Map(integrations.map((i) => [i.userId, i.user.email]));

  if (userIds.length === 0) {
    return NextResponse.json({ apply, integrations: 0, plan: [], applied: 0, message: "No active HealthIntegrations." });
  }

  const habits = await prisma.habit.findMany({
    where: {
      userId: { in: userIds },
      active: true,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      trackingMode: "MANUAL" as any,
    },
    select: { id: true, userId: true, title: true },
  });

  const plan: {
    habitId: string;
    userEmail: string;
    title: string;
    metricKey: string;
    metricTarget: number;
    metricComparison: "GTE";
  }[] = [];

  for (const h of habits) {
    const inferred = inferFromTitle(h.title);
    if (!inferred) continue;
    plan.push({
      habitId: h.id,
      userEmail: emailById.get(h.userId) ?? "?",
      title: h.title ?? "",
      ...inferred,
    });
  }

  if (!apply) {
    return NextResponse.json({
      apply: false,
      integrations: userIds.length,
      planSize: plan.length,
      plan,
      message: "Dry-run. Add ?confirm=1 to apply.",
    });
  }

  let ok = 0;
  for (const p of plan) {
    await prisma.habit.update({
      where: { id: p.habitId },
      data: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        trackingMode: "WEARABLE_AUTO" as any,
        metricKey: p.metricKey,
        metricTarget: p.metricTarget,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        metricComparison: p.metricComparison as any,
      },
    });
    ok++;
  }

  return NextResponse.json({
    apply: true,
    integrations: userIds.length,
    planSize: plan.length,
    applied: ok,
    plan,
  });
}
