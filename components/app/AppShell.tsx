"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChatSidebar } from "./ChatSidebar";
import { CommandPalette } from "./CommandPalette";
import { Home, User, Activity, Menu, X, MessageSquare, CalendarDays, Target, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { InstallPrompt } from "./InstallPrompt";

interface AppShellProps {
  user: { id: string; name: string | null; email: string; avatarUrl: string | null };
  children: React.ReactNode;
}

const NAV_ITEMS = [
  { href: "/today", icon: Home, label: "Today" },
  { href: "/chat", icon: MessageSquare, label: "Coach" },
  { href: "/month", icon: CalendarDays, label: "Calendar" },
  { href: "/goals", icon: Target, label: "Goals" },
  { href: "/body", icon: Sparkles, label: "Body" },
];

export function AppShell({ user, children }: AppShellProps) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  const isChat = pathname.startsWith("/chat");
  const isGuest = user.email.startsWith("guest_") && user.email.endsWith("@guest.vita");

  return (
    <div className="aurora-bg min-h-screen flex flex-col">
      {/* Guest banner */}
      {isGuest && !bannerDismissed && (
        <div className="relative z-30 flex items-center justify-between gap-3 px-4 py-2 text-xs bg-primary/10 border-b border-primary/20 text-primary">
          <span>You're browsing as a guest — <Link href="/auth/register" className="underline font-medium">create a free account</Link> to save your progress.</span>
          <button onClick={() => setBannerDismissed(true)} className="shrink-0 opacity-60 hover:opacity-100 transition-opacity"><X size={13} /></button>
        </div>
      )}
      {/* Top bar */}
      <header className="relative z-20 flex items-center justify-between px-5 h-12 border-b border-border" style={{ background: "rgba(6,8,16,0.85)", backdropFilter: "blur(20px)" }}>
        <div className="flex items-center gap-3">
          {isChat && (
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden p-1 rounded hover:bg-secondary">
              {sidebarOpen ? <X size={16} /> : <Menu size={16} />}
            </button>
          )}
          <span className="font-cormorant text-lg font-light tracking-[0.18em] uppercase text-white/80">
            Vita
          </span>
        </div>
        <button
          onClick={() => setCmdOpen(true)}
          className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
        >
          <span>Search</span>
          <kbd className="px-1.5 py-0.5 rounded text-[10px] bg-secondary border border-border">⌘K</kbd>
        </button>
        <div className="w-7 h-7 rounded-full border border-border flex items-center justify-center text-xs text-muted-foreground">
          {user.name?.[0]?.toUpperCase() ?? user.email[0].toUpperCase()}
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative z-10">
        {/* Sidebar (chat only) */}
        {isChat && (
          <div className={cn(
            "absolute inset-y-0 left-0 z-30 lg:relative lg:block transition-transform duration-200",
            sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
            "w-64 border-r border-border",
          )} style={{ background: "rgba(255,255,255,0.02)" }}>
            <ChatSidebar onNavigate={() => setSidebarOpen(false)} />
          </div>
        )}

        {/* Main content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>

      {/* Bottom nav */}
      <nav className="relative z-20 border-t border-border" style={{ background: "rgba(6,8,16,0.90)", backdropFilter: "blur(20px)" }}>
        <div className="flex">
          {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
            const active = pathname === href || (href !== "/" && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[10px] tracking-wide transition-colors",
                  active ? "text-white/90" : "text-white/25 hover:text-white/50"
                )}
              >
                <Icon size={17} strokeWidth={active ? 2 : 1.5} />
                <span className="uppercase tracking-widest" style={{ fontSize: 8 }}>{label}</span>
                {active && <span className="w-3 h-px bg-white/40 mt-0.5" />}
              </Link>
            );
          })}
        </div>
      </nav>

      <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} />
      <InstallPrompt />
    </div>
  );
}
