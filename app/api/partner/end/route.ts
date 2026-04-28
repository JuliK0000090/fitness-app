import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const Body = z.object({ partnerId: z.string() });

export async function POST(req: NextRequest) {
  const session = await requireSession();
  const body = Body.parse(await req.json());

  const partner = await prisma.accountabilityPartner.findFirst({
    where: { id: body.partnerId, userId: session.userId },
  });
  if (!partner) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.accountabilityPartner.update({
    where: { id: partner.id },
    data: { status: "ENDED", endedAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
