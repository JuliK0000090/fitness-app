/**
 * HAE (Health Auto Export) webhook — optional catch-all.
 *
 * [[...path]] matches the base path AND any sub-paths:
 *   /api/webhooks/hae                      → path = [] (base, no token)
 *   /api/webhooks/hae/{token}              → path = ["token"]
 *   /api/webhooks/hae/{token}/2026-04-18   → path = ["token", "2026-04-18"]
 *
 * The token is always path[0]. Accepts all HTTP methods.
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
  { params }: { params: Promise<{ path?: string[] }> }
) {
  const { path } = await params;
  const token = path?.[0];

  console.log(`[HAE] method=${req.method} path=/${path?.join("/")} token=${token}`);

  try {
    if (!token) {
      return NextResponse.json({ ok: true });
    }

    // Health-check: GET with only the token segment returns status info
    if (req.method === "GET" && path.length === 1) {
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

    const integration = await db.healthIntegration.findUnique({
      where: { webhookToken: token },
    });

    if (!integration || !integration.active) {
      // Return 200 always — never let HAE retry-storm on token issues
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
    console.error("[HAE] error:", err instanceof Error ? err.message : String(err));
    return NextResponse.json({ ok: true });
  }
}

// OPTIONS preflight — Next.js returns 405 for OPTIONS unless explicitly exported.
// HAE sends OPTIONS before each upload; a 405 here aborts the entire upload.
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      Allow: "GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}

// Accept every other HTTP method
export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
export const HEAD = handle;
