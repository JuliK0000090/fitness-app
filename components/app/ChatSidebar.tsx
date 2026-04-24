"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { Plus, Pin, Trash2, Pencil, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

interface Conversation {
  id: string;
  title: string | null;
  pinned: boolean;
  updatedAt: string;
  messages: { content: string; role: string }[];
}

export function ChatSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const router = useRouter();
  const params = useParams();
  const activeId = params?.id as string | undefined;
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/conversations");
    if (res.ok) setConversations(await res.json());
  }, []);

  useEffect(() => { load(); }, [load]);

  async function newChat() {
    const res = await fetch("/api/conversations", { method: "POST" });
    const conv = await res.json();
    router.push(`/chat/${conv.id}`);
    onNavigate?.();
    setConversations((prev) => [conv, ...prev]);
  }

  async function rename(id: string) {
    await fetch(`/api/conversations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: editTitle }),
    });
    setConversations((prev) => prev.map((c) => c.id === id ? { ...c, title: editTitle } : c));
    setEditingId(null);
  }

  async function togglePin(id: string, pinned: boolean) {
    await fetch(`/api/conversations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pinned: !pinned }),
    });
    setConversations((prev) => prev.map((c) => c.id === id ? { ...c, pinned: !pinned } : c));
  }

  async function deleteConv(id: string) {
    await fetch(`/api/conversations/${id}`, { method: "DELETE" });
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (activeId === id) router.push("/chat");
    toast.success("Conversation deleted");
  }

  const pinned = conversations.filter((c) => c.pinned);
  const recent = conversations.filter((c) => !c.pinned);

  return (
    <div className="flex flex-col h-full py-3">
      <div className="px-3 mb-3">
        <button
          onClick={newChat}
          className="w-full flex items-center gap-2 px-3 py-2 rounded border border-border-subtle bg-bg-surface text-caption text-text-muted hover:border-border-default hover:text-text-secondary transition-colors"
        >
          <Plus size={12} strokeWidth={1.5} />
          New chat
          <kbd className="ml-auto text-[9px] text-text-disabled">N</kbd>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 space-y-0.5">
        {pinned.length > 0 && (
          <>
            <p className="px-2 py-1 text-caption text-text-disabled uppercase tracking-widest">Pinned</p>
            {pinned.map((conv) => (
              <ConvItem
                key={conv.id} conv={conv} active={activeId === conv.id}
                onNavigate={onNavigate} editingId={editingId} editTitle={editTitle}
                setEditingId={setEditingId} setEditTitle={setEditTitle}
                rename={rename} togglePin={togglePin} deleteConv={deleteConv}
              />
            ))}
          </>
        )}
        {recent.length > 0 && (
          <>
            {pinned.length > 0 && (
              <p className="px-2 py-1 text-caption text-text-disabled uppercase tracking-widest">Recent</p>
            )}
            {recent.map((conv) => (
              <ConvItem
                key={conv.id} conv={conv} active={activeId === conv.id}
                onNavigate={onNavigate} editingId={editingId} editTitle={editTitle}
                setEditingId={setEditingId} setEditTitle={setEditTitle}
                rename={rename} togglePin={togglePin} deleteConv={deleteConv}
              />
            ))}
          </>
        )}
        {conversations.length === 0 && (
          <p className="text-caption text-text-disabled text-center py-8">
            No conversations yet.
          </p>
        )}
      </div>
    </div>
  );
}

function ConvItem({ conv, active, onNavigate, editingId, editTitle, setEditingId, setEditTitle, rename, togglePin, deleteConv }: {
  conv: Conversation;
  active: boolean;
  onNavigate?: () => void;
  editingId: string | null;
  editTitle: string;
  setEditingId: (id: string | null) => void;
  setEditTitle: (t: string) => void;
  rename: (id: string) => void;
  togglePin: (id: string, pinned: boolean) => void;
  deleteConv: (id: string) => void;
}) {
  const isEditing = editingId === conv.id;

  return (
    <div className={cn(
      "group relative flex items-start gap-2 px-2 py-2 rounded transition-colors cursor-pointer",
      active
        ? "bg-bg-elevated text-text-primary"
        : "text-text-muted hover:bg-bg-surface hover:text-text-secondary"
    )}>
      {isEditing ? (
        <div className="flex-1 flex items-center gap-1">
          <input
            autoFocus
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") rename(conv.id); if (e.key === "Escape") setEditingId(null); }}
            className="flex-1 bg-transparent border-b border-champagne/50 text-caption text-text-primary outline-none py-0.5"
          />
          <button onClick={() => rename(conv.id)} className="text-champagne hover:text-champagne-soft">
            <Check size={11} strokeWidth={1.5} />
          </button>
          <button onClick={() => setEditingId(null)} className="text-text-disabled hover:text-text-muted">
            <X size={11} strokeWidth={1.5} />
          </button>
        </div>
      ) : (
        <Link href={`/chat/${conv.id}`} onClick={onNavigate} className="flex-1 min-w-0">
          <p className="truncate text-caption font-medium">{conv.title ?? "New conversation"}</p>
          <p className="text-[9px] text-text-disabled mt-0.5">
            {formatDistanceToNow(new Date(conv.updatedAt), { addSuffix: true })}
          </p>
        </Link>
      )}

      {!isEditing && (
        <div className="hidden group-hover:flex items-center gap-1 shrink-0">
          <button
            onClick={() => togglePin(conv.id, conv.pinned)}
            className={cn("p-0.5 rounded transition-colors", conv.pinned ? "text-champagne" : "text-text-disabled hover:text-text-muted")}
            title={conv.pinned ? "Unpin" : "Pin"}
          >
            <Pin size={10} strokeWidth={1.5} />
          </button>
          <button
            onClick={() => { setEditingId(conv.id); setEditTitle(conv.title ?? ""); }}
            className="p-0.5 rounded text-text-disabled hover:text-text-muted transition-colors"
          >
            <Pencil size={10} strokeWidth={1.5} />
          </button>
          <button
            onClick={() => deleteConv(conv.id)}
            className="p-0.5 rounded text-text-disabled hover:text-terracotta transition-colors"
          >
            <Trash2 size={10} strokeWidth={1.5} />
          </button>
        </div>
      )}
    </div>
  );
}
