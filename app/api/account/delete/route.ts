import { NextRequest, NextResponse } from "next/server";
import { requireSession, COOKIE } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await requireSession();
  const { confirm } = await req.json();

  if (confirm !== "DELETE") {
    return NextResponse.json({ error: "Confirmation text must be DELETE" }, { status: 400 });
  }

  // Mark for deletion — actual hard delete runs after 30-day grace period via a cron job
  await prisma.user.update({
    where: { id: session.userId },
    data: { deleteRequestedAt: new Date() },
  });

  // Invalidate all sessions immediately
  await prisma.session.deleteMany({ where: { userId: session.userId } });

  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE, "", { maxAge: 0, path: "/" });
  return res;
}
