/**
 * Root-level POST/PUT/PATCH handler.
 *
 * If HAE's Export History is configured with just the base domain
 * (https://yourapp.railway.app without the /api/webhooks/hae/TOKEN path),
 * Next.js would normally return 405 because app/page.tsx only serves GET.
 * This route.ts coexists with page.tsx and catches non-GET methods at root.
 *
 * Returns a JSON error pointing to the correct URL format so Railway logs
 * reveal exactly what HAE is sending.
 */
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function handle(req: NextRequest) {
  console.error(
    `[HAE misconfigured] ${req.method} ${req.nextUrl.pathname} — ` +
    `HAE is posting to the root URL instead of /api/webhooks/hae/{token}. ` +
    `Update the automation URL in Health Auto Export.`
  );
  return NextResponse.json(
    {
      error: "wrong_url",
      message:
        "This is not the webhook endpoint. Copy the full webhook URL from Vita → Settings → Apple Health — it should end with /api/webhooks/hae/{token}.",
    },
    { status: 400 }
  );
}

export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
