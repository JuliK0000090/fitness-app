import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Redirect to most recent conversation, or create one if none exist
export default async function ChatPage() {
  const session = await requireSession();

  const recent = await prisma.conversation.findFirst({
    where: { userId: session.userId, deletedAt: null },
    orderBy: { updatedAt: "desc" },
  });

  if (recent) {
    redirect(`/chat/${recent.id}`);
  }

  // First ever conversation
  const conv = await prisma.conversation.create({
    data: { userId: session.userId },
  });
  redirect(`/chat/${conv.id}`);
}
