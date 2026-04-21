import { prisma } from "@/lib/prisma";
import { nanoid } from "nanoid";

export async function getOrCreatePreferences(userId: string) {
  return prisma.emailPreference.upsert({
    where: { userId },
    create: { userId },
    update: {},
  });
}

export async function generateUnsubscribeUrl(userId: string, category?: string): Promise<string> {
  const token = nanoid(32);
  await prisma.unsubscribeToken.create({ data: { token, userId, category: category ?? null } });
  const base = process.env.APP_URL ?? "http://localhost:3000";
  return `${base}/api/unsubscribe/${token}`;
}
