"use client";

import { useState } from "react";
import { Settings, LogOut, Download, Trash2, ChevronRight, Edit3, Check, X } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { format } from "date-fns";
import { EditorialRule } from "@/components/ui/editorial-rule";

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

  const initial = (user.name?.[0] ?? user.email[0]).toUpperCase();

  return (
    <div className="max-w-lg mx-auto px-5 py-10 space-y-8">

      {/* Identity */}
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-full border border-border-default bg-bg-surface flex items-center justify-center text-display-sm font-serif font-light text-text-primary select-none">
          {initial}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="font-serif text-display-sm font-light text-text-primary">{user.name ?? "User"}</h1>
          <p className="text-caption text-text-muted">{user.email}</p>
          <p className="text-caption text-text-disabled">Member since {format(new Date(user.createdAt), "MMMM yyyy")}</p>
        </div>
        <button
          onClick={() => setEditing((e) => !e)}
          className="p-2 rounded border border-border-subtle text-text-disabled hover:text-text-muted hover:border-border-default transition-colors"
          aria-label={editing ? "Cancel edit" : "Edit profile"}
        >
          {editing ? <X size={13} strokeWidth={1.5} /> : <Edit3 size={13} strokeWidth={1.5} />}
        </button>
      </div>

      <EditorialRule />

      {/* Edit form */}
      {editing && (
        <div className="border border-border-default bg-bg-surface rounded-md p-4 space-y-3">
          <p className="text-body-sm font-medium text-text-primary">Edit profile</p>

          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Display name"
            className="w-full bg-bg-inset border border-border-default rounded px-3 py-2 text-body-sm text-text-primary placeholder:text-text-disabled outline-none focus:border-champagne transition-colors"
          />

          <textarea
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder="Custom instructions (e.g. I prefer HIIT, I'm vegetarian)"
            rows={3}
            className="w-full bg-bg-inset border border-border-default rounded px-3 py-2 text-body-sm text-text-primary placeholder:text-text-disabled outline-none focus:border-champagne transition-colors resize-none"
          />

          <select
            value={responseStyle}
            onChange={(e) => setResponseStyle(e.target.value)}
            className="w-full bg-bg-inset border border-border-default rounded px-3 py-2 text-body-sm text-text-primary outline-none focus:border-champagne transition-colors"
          >
            <option value="">Response style (default)</option>
            <option value="concise">Concise — short, to the point</option>
            <option value="detailed">Detailed — thorough explanations</option>
            <option value="motivational">Motivational — high energy</option>
            <option value="clinical">Clinical — data-focused</option>
          </select>

          {/* GLP-1 toggle hidden — feature blended out pending re-enable */}

          <div className="flex gap-2 pt-1">
            <button
              onClick={save}
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded border border-border-default text-body-sm text-text-secondary hover:border-border-strong hover:text-text-primary disabled:opacity-50 transition-colors"
            >
              <Check size={13} strokeWidth={1.5} />
              {saving ? "Saving…" : "Save"}
            </button>
            <button
              onClick={() => setEditing(false)}
              className="px-4 py-2 rounded border border-border-subtle text-body-sm text-text-disabled hover:text-text-muted transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Body stats */}
      {[user.heightCm, user.sex, user.activityLevel, user.goalWeightKg].some(Boolean) && (
        <div className="space-y-3">
          <p className="text-label tracking-widest uppercase text-text-disabled font-sans font-medium">Body stats</p>
          <div className="border border-border-subtle bg-bg-surface rounded-md divide-y divide-border-subtle">
            {[
              user.heightCm && { label: "Height", value: `${user.heightCm} cm` },
              user.sex && { label: "Sex", value: user.sex },
              user.activityLevel && { label: "Activity", value: user.activityLevel },
              user.goalWeightKg && { label: "Goal weight", value: `${user.goalWeightKg} kg` },
            ].filter(Boolean).map((item) => item && (
              <div key={item.label} className="flex justify-between px-4 py-3 text-body-sm">
                <span className="text-text-muted">{item.label}</span>
                <span className="font-medium text-text-primary capitalize">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Menu */}
      <div className="space-y-1">
        <div className="border border-border-subtle bg-bg-surface rounded-md divide-y divide-border-subtle overflow-hidden">
          <Link href="/settings" className="flex items-center gap-3 px-4 py-3.5 hover:bg-bg-elevated transition-colors group">
            <Settings size={14} strokeWidth={1.5} className="text-text-muted" />
            <span className="flex-1 text-body-sm text-text-secondary">Settings</span>
            <ChevronRight size={13} strokeWidth={1.5} className="text-text-disabled group-hover:text-text-muted transition-colors" />
          </Link>

          <button onClick={exportData} className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-bg-elevated transition-colors text-left">
            <Download size={14} strokeWidth={1.5} className="text-text-muted" />
            <span className="flex-1 text-body-sm text-text-secondary">Export my data</span>
          </button>

          <button onClick={signOut} className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-bg-elevated transition-colors text-left">
            <LogOut size={14} strokeWidth={1.5} className="text-text-muted" />
            <span className="flex-1 text-body-sm text-text-secondary">Sign out</span>
          </button>
        </div>

        <div className="border border-border-subtle bg-bg-surface rounded-md overflow-hidden">
          <Link href="/settings" className="flex items-center gap-3 px-4 py-3.5 hover:bg-bg-elevated transition-colors group">
            <Trash2 size={14} strokeWidth={1.5} className="text-terracotta/60" />
            <span className="flex-1 text-body-sm text-terracotta/60">Delete account</span>
            <ChevronRight size={13} strokeWidth={1.5} className="text-text-disabled group-hover:text-terracotta/60 transition-colors" />
          </Link>
        </div>
      </div>
    </div>
  );
}
