import Link from "next/link";
import { Brain, Shield, Bell, Palette, ChevronRight, Watch, Heart } from "lucide-react";

const SETTINGS = [
  { href: "/settings/integrations/apple-health", icon: Heart, color: "rgba(255,255,255,0.5)", label: "Apple Health", desc: "Connect your iPhone steps, sleep, and workouts" },
  { href: "/settings/memory", icon: Brain, color: "rgba(255,255,255,0.5)", label: "Memory", desc: "Manage what Vita remembers about you" },
  { href: "/settings/notifications", icon: Bell, color: "rgba(255,255,255,0.5)", label: "Notifications", desc: "Morning briefings, nudges, and alerts" },
  { href: "/settings/appearance", icon: Palette, color: "rgba(255,255,255,0.5)", label: "Appearance", desc: "Theme, font size, reduced motion" },
  { href: "/settings/privacy", icon: Shield, color: "rgba(255,255,255,0.5)", label: "Privacy & Data", desc: "Export, delete, and data settings" },
  { href: "/settings/wearables", icon: Watch, color: "rgba(255,255,255,0.5)", label: "Wearables", desc: "Connect fitness devices and wearables" },
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
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(255,255,255,0.05)" }}>
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
