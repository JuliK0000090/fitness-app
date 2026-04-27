import Link from "next/link";
import { Brain, Shield, Bell, Watch, Heart, ChevronRight, ShieldAlert } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";

const SETTINGS = [
  {
    group: "Integrations",
    items: [
      { href: "/settings/integrations/apple-health", icon: Heart, label: "Apple Health", desc: "Steps, sleep, HRV, and workouts from your iPhone" },
      { href: "/settings/wearables", icon: Watch, label: "Wearables", desc: "Connect fitness devices and other wearables" },
    ],
  },
  // GLP-1 mode hidden — feature blended out pending re-enable
  {
    group: "Plan",
    items: [
      { href: "/settings/constraints", icon: ShieldAlert, label: "Constraints", desc: "Treatments, injuries, travel, and blackout days that the planner respects" },
      { href: "/settings/plan", icon: ShieldAlert, label: "Plan health", desc: "Regenerate the 8-week schedule from your weekly targets" },
    ],
  },
  {
    group: "Privacy & Memory",
    items: [
      { href: "/settings/memory", icon: Brain, label: "Memory", desc: "Manage what Vita remembers about you" },
      { href: "/settings/privacy", icon: Shield, label: "Privacy & Data", desc: "Export, delete, and retention settings" },
    ],
  },
  {
    group: "Notifications",
    items: [
      { href: "/settings/notifications", icon: Bell, label: "Notifications", desc: "Morning briefings, nudges, and re-entry reminders" },
    ],
  },
];

export default function SettingsPage() {
  return (
    <div className="max-w-lg mx-auto px-5 py-10 space-y-10">
      <PageHeader
        eyebrow="Account"
        title="Settings"
        rule={true}
      />

      <div className="space-y-8">
        {SETTINGS.map(({ group, items }) => (
          <div key={group} className="space-y-1">
            <p className="text-label tracking-widest uppercase text-text-disabled font-sans font-medium mb-3">
              {group}
            </p>
            <div className="divide-y divide-border-subtle border border-border-subtle rounded-md overflow-hidden">
              {items.map(({ href, icon: Icon, label, desc }) => (
                <Link
                  key={href}
                  href={href}
                  className="flex items-center gap-4 px-4 py-3.5 bg-bg-surface hover:bg-bg-elevated transition-colors group"
                >
                  <div className="w-8 h-8 rounded border border-border-default bg-bg-base flex items-center justify-center shrink-0">
                    <Icon size={14} strokeWidth={1.5} className="text-text-muted" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-body-sm text-text-primary font-medium">{label}</p>
                    <p className="text-caption text-text-muted truncate">{desc}</p>
                  </div>
                  <ChevronRight size={13} strokeWidth={1.5} className="text-text-disabled group-hover:text-text-muted transition-colors shrink-0" />
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
