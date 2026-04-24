import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { inngest } from "@/lib/inngest";

export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === "production" && process.env.HEALTH_DEBUG !== "1") {
    return NextResponse.json({ error: "Not available" }, { status: 403 });
  }

  try {
    const session = await requireSession();
    const { rawId } = await req.json();
    if (!rawId || typeof rawId !== "string") {
      return NextResponse.json({ error: "rawId required" }, { status: 400 });
    }

    await inngest.send({
      name: "health/hae.raw.received",
      data: { rawId, userId: session.userId },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
}
