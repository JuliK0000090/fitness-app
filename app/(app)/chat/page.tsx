import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Redirect to most recent conversation, or create one if none exist.
// Passes through ?q= pre-fill param so callers (e.g. goal cards) can seed the input.
export default async function ChatPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const session = await requireSession();
  const { q } = await searchParams;
  // When ?q= is present (e.g. from a goal card), always open a fresh conversation
  // so the prefill message fires on an empty chat and Vita responds immediately.
  if (q) {
    const conv = await prisma.conversation.create({
      data: { userId: session.userId },
    });
    redirect(`/chat/${conv.id}?q=${encodeURIComponent(q)}`);
  }

  // Normal navigation: go to most recent conversation
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
