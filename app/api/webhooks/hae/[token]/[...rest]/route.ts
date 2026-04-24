/**
 * Catch-all route for HAE "Export History" sub-paths.
 *
 * HAE appends the date (or other segments) to the webhook URL when exporting history:
 *   POST /api/webhooks/hae/{token}/2026-04-18
 *
 * This route captures anything under /{token}/* and delegates to the same
 * POST handler logic, extracting the token from params.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { inngest } from "@/lib/inngest";

export const maxDuration = 30;
export const dynamic = "force-dynamic";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any;

async function handle(
  req: NextRequest,
  { params }: { params: Promise<{ token: string; rest: string[] }> }
) {
  try {
    const { token } = await params;

    console.log(`[HAE catch-all] method=${req.method} token=${token} path=${req.nextUrl.pathname}`);

    const integration = await db.healthIntegration.findUnique({
      where: { webhookToken: token },
    });

    if (!integration || !integration.active) {
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

    await inngest.send({
      name: "health/hae.raw.received",
      data: { rawId: raw.id, userId: integration.userId },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[HAE catch-all] error:", err instanceof Error ? err.message : String(err));
    return NextResponse.json({ ok: true });
  }
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
