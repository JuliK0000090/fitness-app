/**
 * Send an accountability-partner invite. Creates an
 * AccountabilityPartner row with PENDING status and a unique
 * inviteToken, then emails the partner via Resend.
 *
 * Constraints:
 *   - One ACCEPTED partnership per user — caller refuses if already
 *     ACCEPTED. Existing PENDING is replaced (re-invite to same email
 *     refreshes the token + invitedAt; different email cancels old
 *     PENDING).
 *   - inviteToken is opaque, 32 url-safe bytes; expires after 7 days
 *     (enforced at /partner/accept).
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import crypto from "node:crypto";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email/send";
import { appUrl } from "@/lib/partner/share";
import PartnerInvite from "@/emails/partner/Invite";
import React from "react";

const Body = z.object({
  partnerName: z.string().min(1).max(80),
  partnerEmail: z.string().email().max(120).toLowerCase(),
});

function makeToken(): string {
  return crypto.randomBytes(24).toString("base64url");
}

export async function POST(req: NextRequest) {
  const session = await requireSession();
  const userId = session.userId;
  const body = Body.parse(await req.json());

  const me = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { name: true, email: true },
  });
  const myFirst = (me.name ?? me.email.split("@")[0]).trim().split(/\s+/)[0] || "your friend";

  // Refuse if there's already an ACCEPTED partnership — one partner only
  const existingAccepted = await prisma.accountabilityPartner.findFirst({
    where: { userId, status: "ACCEPTED" },
  });
  if (existingAccepted) {
    return NextResponse.json(
      { error: "You already have an active accountability partner. End that partnership first." },
      { status: 400 },
    );
  }

  // Cancel any prior PENDING — a fresh invite supersedes
  await prisma.accountabilityPartner.updateMany({
    where: { userId, status: "PENDING" },
    data: { status: "ENDED", endedAt: new Date() },
  });

  const inviteToken = makeToken();
  const partner = await prisma.accountabilityPartner.create({
    data: {
      userId,
      partnerEmail: body.partnerEmail,
      partnerName: body.partnerName,
      inviteToken,
      status: "PENDING",
    },
  });

  const acceptUrl = `${appUrl()}/partner/accept/${inviteToken}`;

  const result = await sendEmail({
    userId,
    to: body.partnerEmail,
    templateId: "partner-invite",
    category: "transactional",
    subject: `${myFirst} wants you in their corner.`,
    preview: `${myFirst} wants you as her one accountability partner.`,
    react: React.createElement(PartnerInvite, {
      userFirstName: myFirst,
      partnerName: body.partnerName,
      acceptUrl,
    }),
  });

  if (!result.ok) {
    // Email failed — keep the PENDING row; user can resend from /settings/partner.
    return NextResponse.json(
      { ok: false, partnerId: partner.id, reason: result.reason ?? "email-send-failed" },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true, partnerId: partner.id });
}
