"use client";

import { useState, useEffect, useCallback } from "react";
import { Brain, Trash2, Plus, User, BookOpen, Clock } from "lucide-react";
import { toast } from "sonner";

interface Memory {
  id: string;
  type: "profile" | "journal" | "episodic";
  title: string | null;
  content: string;
  source: string | null;
  createdAt: string;
}

const TYPE_META = {
  profile: { label: "Profile", icon: User, color: "rgba(255,255,255,0.5)", desc: "Facts about you — goals, preferences, stats" },
  journal: { label: "Journal", icon: BookOpen, color: "rgba(255,255,255,0.5)", desc: "Weekly reflections and learnings" },
  episodic: { label: "Events", icon: Clock, color: "rgba(255,255,255,0.5)", desc: "Specific past events and milestones" },
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
    const res = await fetch("/api/memories");
    const data = await res.json();
    setMemories(data.memories ?? []);
    setLoading(false);
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
    <div className="max-w-2xl mx-auto py-6 px-4 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-white/[0.04] flex items-center justify-center">
          <Brain size={20} className="text-white/50" />
        </div>
        <div>
          <h1 className="text-lg font-bold">Vita's Memory</h1>
          <p className="text-xs text-muted-foreground">What Vita remembers about you</p>
        </div>
        <button
          onClick={() => setShowAdd((s) => !s)}
          className="ml-auto flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-white/[0.04] text-white/60 hover:bg-white/[0.07] transition-colors"
        >
          <Plus size={12} /> Add
        </button>
      </div>

      {/* Type overview */}
      <div className="grid grid-cols-3 gap-2">
        {(["profile", "journal", "episodic"] as const).map((t) => {
          const meta = TYPE_META[t];
          const count = memories.filter((m) => m.type === t).length;
          return (
            <button
              key={t}
              onClick={() => setFilter(filter === t ? "all" : t)}
              className={`glass rounded-xl p-3 text-left transition-all ${filter === t ? "ring-1" : ""}`}
              style={filter === t ? { outline: "1px solid rgba(255,255,255,0.07)" } : {}}
            >
              <meta.icon size={14} style={{ color: "rgba(255,255,255,0.5)" }} className="mb-1" />
              <p className="text-xs font-medium">{meta.label}</p>
              <p className="text-[10px] text-muted-foreground">{count} item{count !== 1 ? "s" : ""}</p>
            </button>
          );
        })}
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="glass rounded-2xl p-4 space-y-3 fu">
          <p className="text-sm font-semibold">Add memory</p>
          <div className="flex gap-2">
            {(["profile", "journal", "episodic"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setNewType(t)}
                className={`text-xs px-2 py-1 rounded-lg transition-colors ${newType === t ? "bg-white/[0.04] text-white/60" : "bg-secondary text-muted-foreground"}`}
              >
                {TYPE_META[t].label}
              </button>
            ))}
          </div>
          <input
            placeholder="Title (optional)"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            className="w-full bg-secondary rounded-xl px-3 py-2 text-sm outline-none placeholder:text-muted-foreground"
          />
          <textarea
            placeholder="What should Vita remember?"
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            rows={3}
            className="w-full bg-secondary rounded-xl px-3 py-2 text-sm outline-none placeholder:text-muted-foreground resize-none"
          />
          <div className="flex gap-2">
            <button
              onClick={addMemory}
              disabled={saving || !newContent.trim()}
              className="flex-1 py-1.5 rounded-lg bg-white/[0.04] text-white/60 text-xs font-medium hover:bg-white/[0.07] transition-colors disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save"}
            </button>
            <button onClick={() => setShowAdd(false)} className="px-3 py-1.5 rounded-lg bg-secondary text-muted-foreground text-xs">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Memory list */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <div key={i} className="h-16 rounded-2xl bg-secondary animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">
          <Brain size={32} className="mx-auto mb-3 opacity-30" />
          <p>No memories yet.</p>
          <p className="text-xs mt-1">Vita learns from your conversations automatically.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((m) => {
            const meta = TYPE_META[m.type];
            return (
              <div key={m.id} className="glass rounded-2xl p-3 flex gap-3 group fu">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5" style={{ background: "rgba(255,255,255,0.05)" }}>
                  <meta.icon size={13} style={{ color: "rgba(255,255,255,0.5)" }} />
                </div>
                <div className="flex-1 min-w-0">
                  {m.title && <p className="text-xs font-semibold truncate">{m.title}</p>}
                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{m.content}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {new Date(m.createdAt).toLocaleDateString()} · {m.source === "user" ? "Added by you" : "Auto-learned"}
                  </p>
                </div>
                <button
                  onClick={() => deleteMemory(m.id)}
                  className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all shrink-0"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      <p className="text-[10px] text-muted-foreground text-center pb-4">
        Vita learns from your conversations and saves important facts here. You can delete any memory at any time.
      </p>
    </div>
  );
}
