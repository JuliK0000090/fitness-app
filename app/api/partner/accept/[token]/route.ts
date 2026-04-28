import { NextRequest, NextResponse } from "next/server";
import { differenceInDays } from "date-fns";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

const INVITE_EXPIRY_DAYS = 7;

export async function POST(_req: NextRequest, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const partner = await prisma.accountabilityPartner.findUnique({ where: { inviteToken: token } });
  if (!partner) {
    return NextResponse.redirect(new URL("/partner/accept/" + token, _req.url));
  }
  if (partner.status === "ACCEPTED") {
    return NextResponse.redirect(new URL("/partner/accept/" + token, _req.url));
  }
  if (partner.status !== "PENDING") {
    return NextResponse.redirect(new URL("/partner/accept/" + token, _req.url));
  }
  if (differenceInDays(new Date(), partner.invitedAt) > INVITE_EXPIRY_DAYS) {
    await prisma.accountabilityPartner.update({
      where: { id: partner.id },
      data: { status: "ENDED", endedAt: new Date() },
    });
    return NextResponse.redirect(new URL("/partner/accept/" + token, _req.url));
  }

  // If a Vita user with this email is signed in, link them
  let partnerUserId: string | null = null;
  const session = await getSession();
  if (session) {
    const u = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, email: true },
    });
    if (u && u.email.toLowerCase() === partner.partnerEmail.toLowerCase()) {
      partnerUserId = u.id;
    }
  } else {
    // Otherwise look up by email — they may have a Vita account they aren't logged into
    const existing = await prisma.user.findFirst({
      where: { email: { equals: partner.partnerEmail, mode: "insensitive" } },
      select: { id: true },
    });
    if (existing) partnerUserId = existing.id;
  }

  await prisma.accountabilityPartner.update({
    where: { id: partner.id },
    data: { status: "ACCEPTED", acceptedAt: new Date(), partnerUserId },
  });

  return NextResponse.redirect(new URL("/partner/accept/" + token, _req.url));
}
