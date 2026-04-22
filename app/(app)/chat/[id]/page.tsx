import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ChatView } from "@/components/chat/ChatView";

export default async function ChatConversationPage({ params }: { params: Promise<{ id: string }> }) {
  let session;
  try {
    session = await requireSession();
  } catch {
    redirect("/auth/login");
  }
  const { id } = await params;

  let conversation;
  try {
    conversation = await prisma.conversation.findFirst({
      where: { id, userId: session.userId, deletedAt: null },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    });
  } catch {
    redirect("/chat");
  }

  if (!conversation) redirect("/chat");

  const initialMessages = conversation.messages.map((m) => ({
    id: m.id,
    role: m.role as "user" | "assistant",
    content: m.content,
  }));

  return <ChatView conversationId={id} initialMessages={initialMessages} />;
}
