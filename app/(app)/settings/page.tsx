import Link from "next/link";
import { Brain, Shield, Bell, Palette, ChevronRight } from "lucide-react";

const SETTINGS = [
  { href: "/settings/memory", icon: Brain, color: "#A78BFA", label: "Memory", desc: "Manage what Vita remembers about you" },
  { href: "/settings/notifications", icon: Bell, color: "#22D3EE", label: "Notifications", desc: "Morning briefings, nudges, and alerts" },
  { href: "/settings/appearance", icon: Palette, color: "#F472B6", label: "Appearance", desc: "Theme, font size, reduced motion" },
  { href: "/settings/privacy", icon: Shield, color: "#34D399", label: "Privacy & Data", desc: "Export, delete, and data settings" },
];

export default function SettingsPage() {
  return (
    <div className="max-w-lg mx-auto py-6 px-4 space-y-2">
      <div className="mb-6">
        <h1 className="text-lg font-bold">Settings</h1>
        <p className="text-xs text-muted-foreground">Customize your Vita experience</p>
      </div>

      {SETTINGS.map(({ href, icon: Icon, color, label, desc }) => (
        <Link
          key={href}
          href={href}
          className="glass rounded-2xl p-4 flex items-center gap-3 hover:bg-white/5 transition-colors group"
        >
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${color}22` }}>
            <Icon size={16} style={{ color }} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium">{label}</p>
            <p className="text-xs text-muted-foreground">{desc}</p>
          </div>
          <ChevronRight size={14} className="text-muted-foreground group-hover:text-foreground transition-colors" />
        </Link>
      ))}
    </div>
  );
}
