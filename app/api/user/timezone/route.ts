import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// IANA timezone pattern — permissive but avoids injections
const TZ_PATTERN = /^[A-Za-z_]+(?:\/[A-Za-z_\-+0-9]+)*$|^UTC$/;

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    const body = await req.json();
    const tz: unknown = body?.timezone;

    if (typeof tz !== "string" || !TZ_PATTERN.test(tz)) {
      return NextResponse.json({ error: "Invalid timezone" }, { status: 400 });
    }

    // Validate it's a real IANA timezone
    try {
      Intl.DateTimeFormat(undefined, { timeZone: tz });
    } catch {
      return NextResponse.json({ error: "Unknown timezone" }, { status: 400 });
    }

    await prisma.user.update({ where: { id: session.userId }, data: { timezone: tz } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to update timezone" }, { status: 500 });
  }
}
