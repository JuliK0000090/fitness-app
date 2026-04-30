/**
 * Admin one-shot: rename any Goal whose title contains "Victoria's Secret"
 * to "Lean and strong — lifetime goal".
 *
 *   GET /api/admin/rename-vs-goal           → dry-run
 *   GET /api/admin/rename-vs-goal?confirm=1 → applies
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? "juliana.kolarski@gmail.com")
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

const NEW_TITLE = "Lean and strong — lifetime goal";
const VS_PATTERN = /victoria'?s\s+secret/i;

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const me = await prisma.user.findUnique({
    where: { id: session.userId }, select: { email: true },
  });
  if (!me || !ADMIN_EMAILS.includes(me.email.toLowerCase())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const apply = req.nextUrl.searchParams.get("confirm") === "1";

  const candidates = await prisma.goal.findMany({
    where: {
      OR: [
        { title: { contains: "Victoria", mode: "insensitive" } },
        { description: { contains: "Victoria", mode: "insensitive" } },
      ],
    },
    select: { id: true, userId: true, title: true },
  });
  const matches = candidates.filter((g) => g.title && VS_PATTERN.test(g.title));

  if (!apply) {
    return NextResponse.json({
      apply: false,
      planSize: matches.length,
      plan: matches.map((g) => ({ id: g.id, before: g.title, after: NEW_TITLE })),
      message: "Dry-run. Add ?confirm=1 to apply.",
    });
  }

  let ok = 0;
  for (const g of matches) {
    await prisma.goal.update({ where: { id: g.id }, data: { title: NEW_TITLE } });
    ok++;
  }
  return NextResponse.json({ apply: true, applied: ok, planSize: matches.length });
}
