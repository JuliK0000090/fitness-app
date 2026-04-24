import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { inngest } from "@/lib/inngest";

export const maxDuration = 30;
export const dynamic = "force-dynamic";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    const integration = await db.healthIntegration.findUnique({
      where: { webhookToken: token },
    });

    if (!integration || !integration.active) {
      // Still return 200 — never let HAE retry-storm on token issues
      return NextResponse.json({ ok: true });
    }

    const body = await req.json().catch(() => null);

    if (!body || typeof body !== "object") {
      await db.haeRaw.create({
        data: {
          userId: integration.userId,
          payload: {},
          error: "invalid-json-or-empty-body",
        },
      });
      return NextResponse.json({ ok: true });
    }

    const metricCount = Array.isArray(body?.data?.metrics) ? body.data.metrics.length : 0;
    const workoutCount = Array.isArray(body?.data?.workouts) ? body.data.workouts.length : 0;

    // Store raw payload for debugging / reprocessing
    const raw = await db.haeRaw.create({
      data: {
        userId: integration.userId,
        payload: body,
        metricCount,
        workoutCount,
      },
    });

    await db.healthIntegration.update({
      where: { id: integration.id },
      data: {
        lastPayloadAt: new Date(),
        lastPayloadSize: JSON.stringify(body).length,
        totalPayloadCount: { increment: 1 },
      },
    });

    // Fire-and-forget to Inngest — all parsing happens async
    await inngest.send({
      name: "health/hae.raw.received",
      data: { rawId: raw.id, userId: integration.userId },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    // Log only the message, never the payload body
    console.error("[HAE webhook] error:", err instanceof Error ? err.message : String(err));
    // ALWAYS 200 — HAE retries on non-2xx and will cascade-fail otherwise
    return NextResponse.json({ ok: true });
  }
}

// HAE "Export History" may send PUT or PATCH (one request per day) — treat identically to POST
export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  return POST(req, context);
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  return POST(req, context);
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const integration = await db.healthIntegration.findUnique({
    where: { webhookToken: token },
    select: { active: true, lastPayloadAt: true, totalPayloadCount: true },
  });
  if (!integration) return new NextResponse("Not found", { status: 404 });
  return NextResponse.json({
    status: "ok",
    active: integration.active,
    lastPayloadAt: integration.lastPayloadAt,
    totalPayloadCount: integration.totalPayloadCount,
  });
}
