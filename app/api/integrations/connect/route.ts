import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { getTerraWidgetUrl } from "@/lib/terra";

export async function POST(req: NextRequest) {
  let session;
  try {
    session = await requireSession();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json() as { provider?: string };
  const { provider } = body;

  try {
    const url = await getTerraWidgetUrl(session.userId, provider);
    return NextResponse.json({ url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create widget session";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
