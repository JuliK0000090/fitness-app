"use client";

import { useState } from "react";
import { ClipboardList, CheckCircle2, Circle } from "lucide-react";
import { toast } from "sonner";

interface ChecklistItem {
  id: string;
  description: string;
  doneAt: string | null;
}

interface ChecklistCardProps {
  items: ChecklistItem[];
}

export function ChecklistCard({ items: initialItems }: ChecklistCardProps) {
  const [items, setItems] = useState(initialItems);

  async function toggle(id: string, done: boolean) {
    if (done) return; // can't uncheck
    await fetch(`/api/checklist/${id}/complete`, { method: "POST" });
    setItems((prev) => prev.map((i) => i.id === id ? { ...i, doneAt: new Date().toISOString() } : i));
    toast.success("Done! ✓");
  }

  const completed = items.filter((i) => i.doneAt).length;

  return (
    <div className="glass rounded-2xl p-4 space-y-3 my-2 fu border border-[#22D3EE]/20">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-xl bg-[#22D3EE]/20 flex items-center justify-center">
          <ClipboardList size={16} className="text-[#22D3EE]" />
        </div>
        <div>
          <p className="text-sm font-semibold">Today's checklist</p>
          <p className="text-[10px] text-muted-foreground">{completed}/{items.length} done</p>
        </div>
        <div className="ml-auto text-xs text-[#22D3EE] font-semibold">
          {items.length > 0 ? Math.round((completed / items.length) * 100) : 0}%
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#22D3EE] to-[#A78BFA] transition-all duration-500"
          style={{ width: `${items.length > 0 ? (completed / items.length) * 100 : 0}%` }}
        />
      </div>

      <div className="space-y-2">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => toggle(item.id, !!item.doneAt)}
            className="w-full flex items-center gap-2.5 text-left group"
          >
            {item.doneAt
              ? <CheckCircle2 size={16} className="text-[#34D399] shrink-0" />
              : <Circle size={16} className="text-muted-foreground group-hover:text-foreground shrink-0 transition-colors" />
            }
            <span className={`text-sm ${item.doneAt ? "line-through text-muted-foreground" : ""}`}>
              {item.description}
            </span>
          </button>
        ))}
      </div>

      {items.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-2">No items today. Ask Vita to generate your checklist.</p>
      )}
    </div>
  );
}
