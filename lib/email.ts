/**
 * Legacy email helpers — now backed by the new sendEmail infrastructure.
 * These functions are kept for backwards compatibility with existing auth routes.
 */
import { createElement } from "react";
import { sendEmail } from "./email/send";
import { prisma } from "./prisma";
import VerifyEmailTemplate from "@/emails/transactional/VerifyEmail";
import ResetPasswordTemplate from "@/emails/transactional/ResetPassword";
import WelcomeTemplate from "@/emails/transactional/Welcome";
import WeeklyReviewTemplate from "@/emails/recurring/WeeklyReview";

const APP_URL = process.env.APP_URL ?? "http://localhost:3000";

async function getUserFirstName(email: string): Promise<string> {
  try {
    const user = await prisma.user.findUnique({ where: { email }, select: { name: true } });
    return user?.name?.split(" ")[0] ?? "there";
  } catch {
    return "there";
  }
}

async function getUserIdByEmail(email: string): Promise<string | null> {
  try {
    const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    return user?.id ?? null;
  } catch {
    return null;
  }
}

export async function sendVerificationEmail(email: string, token: string) {
  const firstName = await getUserFirstName(email);
  const userId = await getUserIdByEmail(email);
  const verifyUrl = `${APP_URL}/auth/verify-email?token=${token}`;

  if (userId) {
    await sendEmail({
      userId,
      to: email,
      templateId: "verify-email",
      category: "transactional",
      subject: "verify your vita account",
      preview: "One tap and we're in.",
      react: createElement(VerifyEmailTemplate, { firstName, verifyUrl }),
    });
  }
  // Fallback: if no userId yet (shouldn't happen but just in case), do nothing — the user was just created
}

export async function sendPasswordResetEmail(email: string, token: string) {
  const firstName = await getUserFirstName(email);
  const userId = await getUserIdByEmail(email);
  const resetUrl = `${APP_URL}/auth/reset-password?token=${token}`;

  if (!userId) return;

  await sendEmail({
    userId,
    to: email,
    templateId: "reset-password",
    category: "transactional",
    subject: "reset your vita password",
    preview: "Link expires in one hour.",
    react: createElement(ResetPasswordTemplate, { firstName, resetUrl }),
  });
}

export async function sendWelcomeEmail(email: string, userId: string) {
  const firstName = await getUserFirstName(email);
  const goalUrl = `${APP_URL}/goals`;

  await sendEmail({
    userId,
    to: email,
    templateId: "welcome",
    category: "transactional",
    subject: "welcome to vita",
    preview: "Let's figure out where you're going.",
    react: createElement(WelcomeTemplate, { firstName, goalUrl }),
  });
}

export async function sendWeeklyReviewEmail(
  email: string,
  name: string,
  summary: string,
  userId?: string
) {
  const uid = userId ?? await getUserIdByEmail(email);
  if (!uid) return;

  const firstName = name.split(" ")[0] ?? "there";
  const reviewUrl = `${APP_URL}/week`;

  await sendEmail({
    userId: uid,
    to: email,
    templateId: "weekly-review",
    category: "recurring",
    preferenceKey: "weeklyReview",
    subject: "your vita week in review",
    preview: `One thing I noticed.`,
    react: createElement(WeeklyReviewTemplate, {
      firstName,
      workoutsDone: 0,
      workoutsPlanned: 0,
      adherencePct: 0,
      weightDelta: "—",
      waistDelta: "—",
      aiObservation: summary,
      planChange: "",
      reviewUrl,
    }),
  });
}
