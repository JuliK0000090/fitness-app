"use client";

import { useState } from "react";
import { User, Settings, LogOut, Download, Trash2, ChevronRight, Edit3, Check } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { format } from "date-fns";

interface UserData {
  id: string;
  name: string | null;
  email: string;
  avatarUrl: string | null;
  dob?: string;
  sex?: string;
  heightCm?: number;
  activityLevel?: string;
  goalWeightKg?: number;
  onGlp1?: boolean;
  customInstructions?: string;
  customResponseStyle?: string;
  createdAt: string;
}

interface ProfileViewProps {
  user: UserData;
}

export function ProfileView({ user }: ProfileViewProps) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user.name ?? "");
  const [instructions, setInstructions] = useState(user.customInstructions ?? "");
  const [responseStyle, setResponseStyle] = useState(user.customResponseStyle ?? "");
  const [onGlp1, setOnGlp1] = useState(user.onGlp1 ?? false);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    await fetch("/api/account/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, customInstructions: instructions, customResponseStyle: responseStyle, onGlp1 }),
    });
    setSaving(false);
    setEditing(false);
    toast.success("Profile saved");
  }

  async function exportData() {
    const res = await fetch("/api/account/export");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "vita-data-export.json";
    a.click();
    toast.success("Data exported");
  }

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/";
  }

  return (
    <div className="max-w-lg mx-auto py-4 px-4 space-y-4">
      {/* Avatar + name */}
      <div className="flex items-center gap-4 fu">
        <div className="w-16 h-16 rounded-2xl bg-white/[0.06] flex items-center justify-center text-2xl font-black text-background">
          {user.name?.[0]?.toUpperCase() ?? <User size={24} />}
        </div>
        <div>
          <h1 className="text-lg font-bold">{user.name ?? "User"}</h1>
          <p className="text-xs text-muted-foreground">{user.email}</p>
          <p className="text-[10px] text-muted-foreground">Member since {format(new Date(user.createdAt), "MMMM yyyy")}</p>
        </div>
        <button onClick={() => setEditing((e) => !e)} className="ml-auto p-2 rounded-xl hover:bg-secondary">
          <Edit3 size={14} className="text-muted-foreground" />
        </button>
      </div>

      {/* Edit form */}
      {editing && (
        <div className="glass rounded-2xl p-4 space-y-3 fu">
          <p className="text-xs font-semibold">Edit profile</p>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Display name"
            className="w-full bg-secondary rounded-xl px-3 py-2 text-sm outline-none"
          />
          <textarea
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder="Custom instructions for Vita (e.g. 'I prefer HIIT workouts, I'm vegetarian')"
            rows={3}
            className="w-full bg-secondary rounded-xl px-3 py-2 text-sm outline-none resize-none"
          />
          <select
            value={responseStyle}
            onChange={(e) => setResponseStyle(e.target.value)}
            className="w-full bg-secondary rounded-xl px-3 py-2 text-sm outline-none"
          >
            <option value="">Response style (default)</option>
            <option value="concise">Concise — short, to the point</option>
            <option value="detailed">Detailed — thorough explanations</option>
            <option value="motivational">Motivational — high energy</option>
            <option value="clinical">Clinical — data-focused</option>
          </select>
          <label className="flex items-center justify-between gap-3 cursor-pointer py-1">
            <div>
              <p className="text-sm text-white/70">GLP-1 medication</p>
              <p className="text-[11px] text-white/35">On Ozempic, Wegovy, Zepbound, or similar. Vita adjusts protein targets and strength focus to protect muscle.</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={onGlp1}
              onClick={() => setOnGlp1((v) => !v)}
              className={`relative shrink-0 w-10 h-5.5 rounded-full transition-colors ${onGlp1 ? "bg-white/40" : "bg-white/[0.1]"}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-4.5 h-4.5 rounded-full bg-white transition-transform ${onGlp1 ? "translate-x-[18px]" : "translate-x-0"}`} />
            </button>
          </label>
          <div className="flex gap-2">
            <button onClick={save} disabled={saving} className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-white/[0.04] text-white/60 text-xs font-medium hover:bg-white/[0.07] disabled:opacity-50 transition-colors">
              <Check size={12} />{saving ? "Saving…" : "Save"}
            </button>
            <button onClick={() => setEditing(false)} className="px-3 py-1.5 rounded-lg bg-secondary text-muted-foreground text-xs">Cancel</button>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="glass rounded-2xl p-4 space-y-2 fu2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Body stats</p>
        {[
          user.heightCm && { label: "Height", value: `${user.heightCm} cm` },
          user.sex && { label: "Sex", value: user.sex },
          user.activityLevel && { label: "Activity", value: user.activityLevel },
          user.goalWeightKg && { label: "Goal weight", value: `${user.goalWeightKg} kg` },
        ].filter(Boolean).map((item) => item && (
          <div key={item.label} className="flex justify-between text-sm">
            <span className="text-muted-foreground">{item.label}</span>
            <span className="font-medium capitalize">{item.value}</span>
          </div>
        ))}
      </div>

      {/* Menu items */}
      <div className="space-y-1 fu3">
        <Link href="/settings" className="glass rounded-2xl p-3 flex items-center gap-3 hover:bg-white/5 transition-colors group">
          <Settings size={15} className="text-muted-foreground" />
          <span className="flex-1 text-sm">Settings</span>
          <ChevronRight size={13} className="text-muted-foreground" />
        </Link>

        <button onClick={exportData} className="w-full glass rounded-2xl p-3 flex items-center gap-3 hover:bg-white/5 transition-colors text-left">
          <Download size={15} className="text-muted-foreground" />
          <span className="flex-1 text-sm">Export my data</span>
        </button>

        <Link href="/settings" className="glass rounded-2xl p-3 flex items-center gap-3 hover:bg-white/5 transition-colors group">
          <Trash2 size={15} className="text-white/50" />
          <span className="flex-1 text-sm text-white/60">Delete account</span>
          <ChevronRight size={13} className="text-muted-foreground" />
        </Link>

        <button onClick={signOut} className="w-full glass rounded-2xl p-3 flex items-center gap-3 hover:bg-white/5 transition-colors text-left">
          <LogOut size={15} className="text-muted-foreground" />
          <span className="flex-1 text-sm">Sign out</span>
        </button>
      </div>
    </div>
  );
}
