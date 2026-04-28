/**
 * Receives the partner's one-line encouragement, validates the token,
 * enforces one-per-ISO-week via the unique constraint, and fires a push
 * notification to the original user.
 */

import { NextRequest, NextResponse } from "next/server";
import { getISOWeek, getYear } from "date-fns";
import { prisma } from "@/lib/prisma";
import { send } from "@/lib/notifications/send";

const MAX_LEN = 280;

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ partnerId: string; token: string }> },
) {
  const { partnerId, token } = await ctx.params;

  const partner = await prisma.accountabilityPartner.findUnique({
    where: { id: partnerId },
    include: { user: { select: { id: true, name: true } } },
  });
  if (!partner || partner.inviteToken !== token || partner.status !== "ACCEPTED") {
    return NextResponse.json({ error: "Invalid or expired link." }, { status: 400 });
  }

  const form = await req.formData();
  const messageRaw = String(form.get("message") ?? "").trim();
  if (!messageRaw) {
    return NextResponse.redirect(new URL(`/partner/encourage/${partnerId}/${token}`, req.url));
  }
  const message = messageRaw.slice(0, MAX_LEN);

  const now = new Date();
  const weekOfYear = getISOWeek(now);
  const yearNumber = getYear(now);

  try {
    await prisma.partnerEncouragement.create({
      data: {
        partnerId,
        message,
        weekOfYear,
        yearNumber,
      },
    });
  } catch (e: unknown) {
    // Unique constraint violation = already sent this week
    const msg = e instanceof Error ? e.message : String(e);
    if (/Unique constraint/i.test(msg)) {
      return NextResponse.redirect(new URL(`/partner/encourage/${partnerId}/${token}`, req.url));
    }
    console.error("[partner.encourage] create failed:", e);
    return NextResponse.json({ error: "Could not save. Try again." }, { status: 500 });
  }

  // Push notification to the user — best-effort
  send({
    userId: partner.user.id,
    category: "partnerEncouragement",
    title: `From ${partner.partnerName}`,
    body: message.length > 110 ? message.slice(0, 107) + "…" : message,
    deepLink: "/today",
  }).catch((e) => console.error("[partner.encourage] push failed:", e));

  return NextResponse.redirect(
    new URL(`/partner/encourage/${partnerId}/${token}/sent`, req.url),
  );
}
