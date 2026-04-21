import { render } from "@react-email/render";
import { ReactElement } from "react";
import { prisma } from "@/lib/prisma";
import { getResendClient } from "./client";
import { isSuppressed } from "./suppressions";
import { generateUnsubscribeUrl } from "./preferences";

type EmailCategory = "transactional" | "lifecycle" | "recurring" | "celebratory";

export interface SendArgs {
  userId: string;
  to: string;
  templateId: string;
  category: EmailCategory;
  preferenceKey?: string;
  subject: string;
  preview?: string;
  react: ReactElement;
  scheduledAt?: Date;
}

export async function sendEmail(args: SendArgs): Promise<{ ok: boolean; id?: string; reason?: string }> {
  // 1. Suppression check
  if (await isSuppressed(args.to)) {
    await prisma.email.create({
      data: { userId: args.userId, to: args.to, templateId: args.templateId, subject: args.subject, status: "SUPPRESSED" },
    });
    return { ok: false, reason: "suppressed" };
  }

  // 2. Preference check (skip for transactional)
  if (args.category !== "transactional" && args.preferenceKey) {
    const pref = await prisma.emailPreference.findUnique({ where: { userId: args.userId } });
    if (pref && (pref as Record<string, unknown>)[args.preferenceKey] === false) {
      await prisma.email.create({
        data: { userId: args.userId, to: args.to, templateId: args.templateId, subject: args.subject, status: "PREFERENCE_BLOCKED" },
      });
      return { ok: false, reason: "preference_blocked" };
    }
  }

  // 3. Record pre-send
  const record = await prisma.email.create({
    data: { userId: args.userId, to: args.to, templateId: args.templateId, subject: args.subject, status: "QUEUED" },
  });

  // 4. Render
  try {
    const html = await render(args.react);
    const text = await render(args.react, { plainText: true });

    const resend = getResendClient();

    // Build unsubscribe headers for non-transactional
    const extraHeaders: Record<string, string> = {};
    if (args.category !== "transactional") {
      const unsubUrl = await generateUnsubscribeUrl(args.userId, args.preferenceKey);
      extraHeaders["List-Unsubscribe"] = `<${unsubUrl}>`;
      extraHeaders["List-Unsubscribe-Post"] = "List-Unsubscribe=One-Click";
    }

    const res = await resend.emails.send({
      from: process.env.EMAIL_FROM ?? "Vita <onboarding@resend.dev>",
      to: args.to,
      replyTo: process.env.EMAIL_REPLY_TO ?? process.env.EMAIL_FROM ?? "onboarding@resend.dev",
      subject: args.subject,
      html,
      text,
      headers: Object.keys(extraHeaders).length ? extraHeaders : undefined,
      tags: [
        { name: "template", value: args.templateId },
        { name: "category", value: args.category },
      ],
    });

    await prisma.email.update({
      where: { id: record.id },
      data: { resendId: res.data?.id ?? null, status: "SENT", sentAt: new Date() },
    });

    return { ok: true, id: record.id };
  } catch (e) {
    await prisma.email.update({
      where: { id: record.id },
      data: { status: "FAILED", metadata: { error: String(e) } },
    });
    throw e;
  }
}
