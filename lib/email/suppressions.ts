import { prisma } from "@/lib/prisma";

export async function isSuppressed(email: string): Promise<boolean> {
  const s = await prisma.emailSuppression.findUnique({ where: { email } });
  return !!s;
}

export async function addSuppression(email: string, reason: string) {
  await prisma.emailSuppression.upsert({
    where: { email },
    create: { email, reason },
    update: { reason },
  });
}
