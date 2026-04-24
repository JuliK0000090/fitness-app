"use client";

import { useState, useEffect, useCallback } from "react";
import { Brain, Trash2, Plus, User, BookOpen, Clock, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";

interface Memory {
  id: string;
  type: "profile" | "journal" | "episodic";
  title: string | null;
  content: string;
  source: string | null;
  createdAt: string;
}

const TYPE_META = {
  profile:  { label: "Profile",  icon: User,     desc: "Facts about you — goals, preferences, stats" },
  journal:  { label: "Journal",  icon: BookOpen,  desc: "Weekly reflections and learnings" },
  episodic: { label: "Events",   icon: Clock,     desc: "Specific past events and milestones" },
};

export default function MemoryPage() {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "profile" | "journal" | "episodic">("all");
  const [showAdd, setShowAdd] = useState(false);
  const [newType, setNewType] = useState<"profile" | "journal" | "episodic">("profile");
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchMemories = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/memories");
      const data = await res.json();
      setMemories(data.memories ?? []);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchMemories(); }, [fetchMemories]);

  async function deleteMemory(id: string) {
    await fetch(`/api/memories/${id}`, { method: "DELETE" });
    setMemories((prev) => prev.filter((m) => m.id !== id));
    toast.success("Memory removed");
  }

  async function addMemory() {
    if (!newContent.trim()) return;
    setSaving(true);
    await fetch("/api/memories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: newType, title: newTitle || undefined, content: newContent }),
    });
    setNewTitle("");
    setNewContent("");
    setShowAdd(false);
    setSaving(false);
    toast.success("Memory saved");
    fetchMemories();
  }

  const filtered = filter === "all" ? memories : memories.filter((m) => m.type === filter);

  return (
    <div className="max-w-2xl mx-auto px-5 py-10 space-y-8">

      <div className="flex items-end justify-between gap-4">
        <PageHeader eyebrow="Settings" title="Memory" rule={false} />
        <button
          onClick={() => setShowAdd((s) => !s)}
          className="shrink-0 flex items-center gap-1.5 text-caption px-3 py-2 rounded border border-border-default text-text-muted hover:border-border-strong hover:text-text-secondary transition-colors"
        >
          {showAdd ? <X size={12} strokeWidth={1.5} /> : <Plus size={12} strokeWidth={1.5} />}
          {showAdd ? "Cancel" : "Add"}
        </button>
      </div>

      {/* Type filter pills */}
      <div className="grid grid-cols-3 gap-2">
        {(["profile", "journal", "episodic"] as const).map((t) => {
          const meta = TYPE_META[t];
          const count = memories.filter((m) => m.type === t).length;
          const active = filter === t;
          return (
            <button
              key={t}
              onClick={() => setFilter(active ? "all" : t)}
              className={cn(
                "border rounded-md p-3 text-left transition-all",
                active
                  ? "border-border-strong bg-bg-elevated"
                  : "border-border-subtle bg-bg-surface hover:bg-bg-elevated"
              )}
            >
              <meta.icon size={13} strokeWidth={1.5} className={cn("mb-1.5", active ? "text-champagne" : "text-text-muted")} />
              <p className="text-body-sm font-medium text-text-primary">{meta.label}</p>
              <p className="text-caption text-text-disabled">{count} item{count !== 1 ? "s" : ""}</p>
            </button>
          );
        })}
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="border border-border-default bg-bg-surface rounded-md p-4 space-y-3">
          <p className="text-body-sm font-medium text-text-primary">Add memory</p>
          <div className="flex gap-2">
            {(["profile", "journal", "episodic"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setNewType(t)}
                className={cn(
                  "text-caption px-2.5 py-1 rounded border transition-colors",
                  newType === t
                    ? "border-border-strong bg-bg-elevated text-text-primary"
                    : "border-border-subtle text-text-disabled hover:text-text-muted"
                )}
              >
                {TYPE_META[t].label}
              </button>
            ))}
          </div>
          <input
            placeholder="Title (optional)"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            className="w-full bg-bg-inset border border-border-default rounded px-3 py-2 text-body-sm text-text-primary placeholder:text-text-disabled outline-none focus:border-champagne transition-colors"
          />
          <textarea
            placeholder="What should Vita remember?"
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            rows={3}
            className="w-full bg-bg-inset border border-border-default rounded px-3 py-2 text-body-sm text-text-primary placeholder:text-text-disabled outline-none focus:border-champagne transition-colors resize-none"
          />
          <div className="flex gap-2">
            <button
              onClick={addMemory}
              disabled={saving || !newContent.trim()}
              className="flex-1 py-2 rounded border border-border-default text-body-sm text-text-secondary hover:border-border-strong hover:text-text-primary disabled:opacity-50 transition-colors"
            >
              {saving ? "Saving…" : "Save"}
            </button>
            <button
              onClick={() => setShowAdd(false)}
              className="px-4 py-2 rounded border border-border-subtle text-body-sm text-text-disabled hover:text-text-muted transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Memory list */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded border border-border-subtle bg-bg-surface animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Brain size={24} strokeWidth={1.5} className="mx-auto mb-4 text-text-disabled" />
          <p className="text-body-sm text-text-muted">No memories yet.</p>
          <p className="text-caption text-text-disabled mt-1">Vita learns from your conversations automatically.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((m) => {
            const meta = TYPE_META[m.type];
            return (
              <div key={m.id} className="border border-border-subtle bg-bg-surface rounded-md p-3 flex gap-3 group">
                <div className="w-7 h-7 rounded border border-border-subtle bg-bg-elevated flex items-center justify-center shrink-0 mt-0.5">
                  <meta.icon size={12} strokeWidth={1.5} className="text-text-muted" />
                </div>
                <div className="flex-1 min-w-0">
                  {m.title && <p className="text-body-sm font-medium text-text-primary truncate">{m.title}</p>}
                  <p className="text-caption text-text-muted leading-relaxed line-clamp-2">{m.content}</p>
                  <p className="text-caption text-text-disabled mt-0.5">
                    {new Date(m.createdAt).toLocaleDateString()} · {m.source === "user" ? "Added by you" : "Auto-learned"}
                  </p>
                </div>
                <button
                  onClick={() => deleteMemory(m.id)}
                  className="opacity-0 group-hover:opacity-100 p-1.5 rounded hover:bg-terracotta/10 text-text-disabled hover:text-terracotta transition-all shrink-0"
                  aria-label="Delete memory"
                >
                  <Trash2 size={12} strokeWidth={1.5} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      <p className="text-caption text-text-disabled text-center pb-4">
        Vita learns from your conversations and saves important facts here. You can delete any memory at any time.
      </p>
    </div>
  );
}
