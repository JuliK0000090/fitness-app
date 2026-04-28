import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(_req: NextRequest, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const partner = await prisma.accountabilityPartner.findUnique({ where: { inviteToken: token } });
  if (partner && partner.status === "PENDING") {
    await prisma.accountabilityPartner.update({
      where: { id: partner.id },
      data: { status: "DECLINED", endedAt: new Date() },
    });
  }
  return NextResponse.redirect(new URL("/partner/accept/" + token, _req.url));
}
