import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await requireSession();
  const { searchParams } = req.nextUrl;
  const metric = searchParams.get("metric") ?? "steps";
  const days = Math.min(90, parseInt(searchParams.get("days") ?? "30"));

  const since = new Date();
  since.setDate(since.getDate() - days);
  since.setHours(0, 0, 0, 0);

  const rows = await prisma.healthDaily.findMany({
    where: { userId: session.userId, metric, date: { gte: since } },
    orderBy: { date: "asc" },
    select: { date: true, value: true, source: true, trust: true },
  });

  return NextResponse.json(rows.map((r) => ({
    date: r.date.toISOString().split("T")[0],
    value: r.value,
    source: r.source,
    trust: r.trust,
  })));
}
