import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";

export function generateWebhookToken(): string {
  return randomBytes(24).toString("base64url").slice(0, 32);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any;

export async function getOrCreateIntegration(userId: string) {
  const existing = await db.healthIntegration.findUnique({ where: { userId } });
  if (existing) return existing;
  return db.healthIntegration.create({
    data: {
      userId,
      provider: "HEALTH_AUTO_EXPORT",
      webhookToken: generateWebhookToken(),
    },
  });
}

export async function rotateWebhookToken(userId: string) {
  return db.healthIntegration.update({
    where: { userId },
    data: { webhookToken: generateWebhookToken() },
  });
}
