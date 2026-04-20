import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Redirect to most recent conversation or create one
export default async function ChatPage() {
  const session = await requireSession();

  const recent = await prisma.conversation.findFirst({
    where: { userId: session.userId, deletedAt: null },
    orderBy: { updatedAt: "desc" },
  });

  if (recent) {
    redirect(`/chat/${recent.id}`);
  }

  // Create first conversation
  const conv = await prisma.conversation.create({
    data: { userId: session.userId, title: "First chat" },
  });
  redirect(`/chat/${conv.id}`);
}
