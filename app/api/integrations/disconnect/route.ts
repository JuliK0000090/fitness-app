import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deauthTerraUser } from "@/lib/terra";

export async function POST(req: NextRequest) {
  let session;
  try {
    session = await requireSession();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json() as { provider: string };
  const { provider } = body;

  if (!provider) {
    return NextResponse.json({ error: "provider is required" }, { status: 400 });
  }

  const device = await prisma.device.findUnique({
    where: { userId_provider: { userId: session.userId, provider } },
  });

  if (!device) {
    return NextResponse.json({ error: "Device not found" }, { status: 404 });
  }

  // Deauth on Terra side if we have a terraUserId
  if (device.terraUserId) {
    await deauthTerraUser(device.terraUserId).catch(() => {});
  }

  await prisma.device.delete({
    where: { id: device.id },
  });

  return NextResponse.json({ ok: true });
}
