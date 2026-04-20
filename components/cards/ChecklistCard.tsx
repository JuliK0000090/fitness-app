"use client";

import { useState } from "react";
import { CheckCircle2, Circle } from "lucide-react";
import { toast } from "sonner";

interface ChecklistItem {
  id: string;
  description: string;
  doneAt: string | null;
}

export function ChecklistCard({ items: initialItems }: { items: ChecklistItem[] }) {
  const [items, setItems] = useState(initialItems);

  async function toggle(id: string, done: boolean) {
    if (done) return;
    await fetch(`/api/checklist/${id}/complete`, { method: "POST" });
    setItems((prev) => prev.map((i) => i.id === id ? { ...i, doneAt: new Date().toISOString() } : i));
    toast.success("Done");
  }

  const completed = items.filter((i) => i.doneAt).length;
  const pct = items.length > 0 ? (completed / items.length) * 100 : 0;

  return (
    <div className="glass rounded-2xl p-4 space-y-4 my-2 fu">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-white/75">Today&apos;s checklist</p>
          <p className="text-[10px] text-white/30 mt-0.5">{completed} of {items.length} complete</p>
        </div>
        <span className="font-cormorant text-2xl font-light text-white/50">{Math.round(pct)}%</span>
      </div>

      {/* Progress bar */}
      <div className="h-px w-full bg-white/[0.07]">
        <div
          className="h-full bg-white/35 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="space-y-2.5">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => toggle(item.id, !!item.doneAt)}
            className="w-full flex items-center gap-3 text-left group"
          >
            {item.doneAt
              ? <CheckCircle2 size={15} className="text-white/40 shrink-0" />
              : <Circle size={15} className="text-white/20 group-hover:text-white/40 shrink-0 transition-colors" />
            }
            <span className={`text-sm ${item.doneAt ? "line-through text-white/25" : "text-white/65"}`}>
              {item.description}
            </span>
          </button>
        ))}
        {items.length === 0 && (
          <p className="text-xs text-white/25 text-center py-2">Ask Vita to generate your checklist.</p>
        )}
      </div>
    </div>
  );
}
