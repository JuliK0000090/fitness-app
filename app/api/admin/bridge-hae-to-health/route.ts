/**
 * One-shot admin endpoint: re-run rollupDailyForDate for every (userId, date)
 * that already has a HaeDaily row, so the HaeDaily -> HealthDaily bridge
 * inside rollupDailyForDate populates HealthDaily for backlogged data.
 *
 * Gated to ADMIN_EMAILS via session. Idempotent — safe to hit multiple times.
 *
 *   GET /api/admin/bridge-hae-to-health
 */

import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rollupDailyForDate } from "@/lib/health/process-hae";

export const dynamic = "force-dynamic";

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? "juliana.kolarski@gmail.com")
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any;

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const me = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { email: true },
  });
  if (!me || !ADMIN_EMAILS.includes(me.email.toLowerCase())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const rows: { userId: string; date: Date }[] = await db.haeDaily.findMany({
    select: { userId: true, date: true },
    orderBy: [{ userId: "asc" }, { date: "asc" }],
  });

  let ok = 0;
  let failed = 0;
  const fails: { userId: string; date: string; error: string }[] = [];
  for (const r of rows) {
    const dateStr = r.date.toISOString().split("T")[0];
    try {
      await rollupDailyForDate(r.userId, dateStr);
      ok++;
    } catch (e) {
      failed++;
      fails.push({ userId: r.userId, date: dateStr, error: e instanceof Error ? e.message : String(e) });
    }
  }

  const totalHealthDaily = await prisma.healthDaily.count();
  const stepsRows = await prisma.healthDaily.count({ where: { metric: "steps" } });
  const sleepRows = await prisma.healthDaily.count({ where: { metric: "sleepHours" } });
  const myStepRows = await prisma.healthDaily.count({
    where: { userId: session.userId, metric: "steps" },
  });

  return NextResponse.json({
    haeDailyRowsScanned: rows.length,
    bridgedOk: ok,
    bridgedFailed: failed,
    fails: fails.slice(0, 10),
    healthDaily: {
      total: totalHealthDaily,
      steps: stepsRows,
      sleepHours: sleepRows,
      myStepRows,
    },
  });
}
