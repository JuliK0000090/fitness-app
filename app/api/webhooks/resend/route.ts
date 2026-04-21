import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { addSuppression } from "@/lib/email/suppressions";

export async function POST(req: NextRequest) {
  // Verify Resend webhook signature if secret is set
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (secret) {
    const signature = req.headers.get("svix-signature");
    if (!signature) return NextResponse.json({ error: "No signature" }, { status: 401 });
    // Basic verification — in production use the svix library
  }

  const payload = await req.json();
  const { type, data } = payload;

  // Find email record by resendId
  const emailRecord = data?.email_id
    ? await prisma.email.findUnique({ where: { resendId: data.email_id } })
    : null;

  if (emailRecord) {
    // Map Resend event type to our status
    const statusMap: Record<string, string> = {
      "email.sent": "SENT",
      "email.delivered": "DELIVERED",
      "email.bounced": "BOUNCED",
      "email.complained": "COMPLAINED",
      "email.opened": "OPENED",
      "email.clicked": "CLICKED",
    };

    const newStatus = statusMap[type];
    if (newStatus) {
      await prisma.email.update({
        where: { id: emailRecord.id },
        data: { status: newStatus as "SENT" | "DELIVERED" | "BOUNCED" | "COMPLAINED" | "OPENED" | "CLICKED" },
      });
      await prisma.emailEvent.create({
        data: { emailId: emailRecord.id, type, payload },
      });
    }

    // Suppress on hard bounce or complaint
    if (type === "email.bounced" || type === "email.complained") {
      const bounceType = data?.bounce?.type;
      if (type === "email.complained" || bounceType === "hard") {
        await addSuppression(data.to, type === "email.complained" ? "complaint" : "hard_bounce");
      }
    }
  }

  return NextResponse.json({ ok: true });
}
