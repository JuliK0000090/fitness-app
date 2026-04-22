import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Redirect to most recent conversation or create one
export default async function ChatPage() {
  const session = await requireSession();

  // Create a fresh conversation every time we land here without an ID
  // (avoids redirect loops when old conversations are stale/missing)
  const conv = await prisma.conversation.create({
    data: { userId: session.userId },
  });
  redirect(`/chat/${conv.id}`);
}
