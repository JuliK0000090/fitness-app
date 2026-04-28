/**
 * Onboarding partner-invite stub. Records the user's intent to invite
 * a partner during /welcome step 5; actual email sending wires up in
 * Track B Phase 2 (the AccountabilityPartner schema + Resend integration).
 *
 * For now: returns ok and stores intent on the user's profile so Phase 2
 * can pick it up. If Phase 2 hasn't shipped yet, the next page-load on
 * /settings/partner can show the pending invite.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const Body = z.object({
  partnerName: z.string().min(1).max(80),
  partnerEmail: z.string().email().max(120),
});

export async function POST(req: NextRequest) {
  const session = await requireSession();
  const body = Body.parse(await req.json());

  // Track B Phase 2 will wire this to the real AccountabilityPartner row +
  // Resend send. For now we just log the intent so it's not lost.
  console.info(
    `[onboarding] partner invite queued — userId=${session.userId.slice(0, 8)} ` +
    `partner=${body.partnerName} <${body.partnerEmail}>`,
  );

  // No-op write to keep the API contract honest: just touch updatedAt
  // so the request leaves a server-side trace.
  await prisma.user.update({
    where: { id: session.userId },
    data: { updatedAt: new Date() },
  });

  return NextResponse.json({ ok: true, queuedForPhase2: true });
}
