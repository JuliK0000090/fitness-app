"use client";

import { useState } from "react";
import { Download, Trash2, Shield, ToggleLeft, ToggleRight } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/ui/page-header";

export default function PrivacyPage() {
  const [analytics, setAnalytics] = useState(false);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function toggleAnalytics() {
    setLoadingAnalytics(true);
    const next = !analytics;
    try {
      await fetch("/api/account/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analyticsConsent: next }),
      });
      setAnalytics(next);
      toast.success(next ? "Analytics enabled" : "Analytics disabled");
    } catch {
      toast.error("Could not update preference");
    } finally {
      setLoadingAnalytics(false);
    }
  }

  async function exportData() {
    const res = await fetch("/api/account/export");
    if (!res.ok) { toast.error("Export failed"); return; }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `vita-export-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Export downloaded");
  }

  async function deleteAccount() {
    setDeleting(true);
    try {
      const res = await fetch("/api/account/delete", { method: "DELETE" });
      if (!res.ok) throw new Error();
      window.location.href = "/";
    } catch {
      toast.error("Something went wrong. Please try again.");
      setDeleting(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto px-5 py-10 space-y-10">
      <PageHeader
        eyebrow="Settings"
        title="Privacy & Data"
        subtitle="Control what Vita keeps and how it's used."
        rule={true}
      />

      {/* Analytics */}
      <div className="space-y-3">
        <p className="text-label tracking-widest uppercase text-text-disabled font-sans font-medium">Usage data</p>
        <div className="border border-border-subtle rounded-md bg-bg-surface px-4 py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <p className="text-body-sm font-medium text-text-primary">Anonymous analytics</p>
              <p className="text-caption text-text-muted leading-relaxed">
                Helps improve Vita. No personal health data is shared — only aggregate usage patterns (which screens you visit, which features you use).
              </p>
            </div>
            <button
              onClick={toggleAnalytics}
              disabled={loadingAnalytics}
              className="shrink-0 mt-0.5"
              aria-label="Toggle analytics"
            >
              {analytics
                ? <ToggleRight size={28} strokeWidth={1.5} className="text-champagne" />
                : <ToggleLeft size={28} strokeWidth={1.5} className="text-text-disabled" />
              }
            </button>
          </div>
        </div>
      </div>

      {/* Data retention note */}
      <div className="space-y-3">
        <p className="text-label tracking-widest uppercase text-text-disabled font-sans font-medium">Retention</p>
        <div className="border border-border-subtle rounded-md bg-bg-surface px-4 py-4 space-y-2">
          <div className="flex items-center gap-2 text-text-muted">
            <Shield size={13} strokeWidth={1.5} />
            <p className="text-body-sm font-medium text-text-primary">Your data stays yours</p>
          </div>
          <p className="text-caption text-text-muted leading-relaxed">
            Health data, goals, and conversations are stored only for your account. Vita does not sell or share your personal data with third parties.
            You can export or delete everything at any time.
          </p>
        </div>
      </div>

      {/* Export */}
      <div className="space-y-3">
        <p className="text-label tracking-widests uppercase text-text-disabled font-sans font-medium">Your data</p>
        <div className="border border-border-subtle rounded-md overflow-hidden">
          <button
            onClick={exportData}
            className="w-full flex items-center gap-4 px-4 py-3.5 bg-bg-surface hover:bg-bg-elevated transition-colors text-left"
          >
            <div className="w-8 h-8 rounded border border-border-default bg-bg-base flex items-center justify-center shrink-0">
              <Download size={14} strokeWidth={1.5} className="text-text-muted" />
            </div>
            <div className="flex-1">
              <p className="text-body-sm font-medium text-text-primary">Export my data</p>
              <p className="text-caption text-text-muted">Download a JSON file of all your goals, habits, workouts, and health data</p>
            </div>
          </button>
        </div>
      </div>

      {/* Delete account */}
      <div className="space-y-3">
        <p className="text-label tracking-widests uppercase text-text-disabled font-sans font-medium">Danger zone</p>
        <div className="border border-terracotta/20 rounded-md overflow-hidden">
          {!deleteConfirm ? (
            <button
              onClick={() => setDeleteConfirm(true)}
              className="w-full flex items-center gap-4 px-4 py-3.5 bg-bg-surface hover:bg-bg-elevated transition-colors text-left"
            >
              <div className="w-8 h-8 rounded border border-terracotta/20 bg-bg-base flex items-center justify-center shrink-0">
                <Trash2 size={14} strokeWidth={1.5} className="text-terracotta/60" />
              </div>
              <div className="flex-1">
                <p className="text-body-sm font-medium text-terracotta/80">Delete account</p>
                <p className="text-caption text-text-muted">Permanently delete your account and all data. This cannot be undone.</p>
              </div>
            </button>
          ) : (
            <div className="px-4 py-4 space-y-3 bg-bg-surface">
              <p className="text-body-sm text-text-primary font-medium">Are you sure?</p>
              <p className="text-caption text-text-muted">This will permanently delete your account, all health data, goals, habits, and conversation history. There is no recovery.</p>
              <div className="flex gap-2">
                <button
                  onClick={deleteAccount}
                  disabled={deleting}
                  className="flex-1 py-2 rounded border border-terracotta/30 text-body-sm text-terracotta/80 hover:border-terracotta/50 hover:text-terracotta transition-colors disabled:opacity-50"
                >
                  {deleting ? "Deleting…" : "Yes, delete everything"}
                </button>
                <button
                  onClick={() => setDeleteConfirm(false)}
                  className="px-4 py-2 rounded border border-border-subtle text-body-sm text-text-disabled hover:text-text-muted transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
