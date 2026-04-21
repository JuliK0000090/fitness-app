import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { getTerraWidgetUrl } from "@/lib/terra";

export async function POST(req: NextRequest) {
  const session = await requireSession();
  const { provider } = await req.json().catch(() => ({}));

  try {
    // Terra widget URL — pass userId as reference_id
    const widgetUrl = await getTerraWidgetUrl(session.userId, provider);
    return NextResponse.json({ url: widgetUrl });
  } catch (e) {
    console.error("Terra connect error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to get connect URL" },
      { status: 500 }
    );
  }
}
