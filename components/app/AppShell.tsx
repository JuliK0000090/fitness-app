"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChatSidebar } from "./ChatSidebar";
import { CommandPalette } from "./CommandPalette";
import { Home, MessageCircle, Calendar, Target, X, Menu, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { InstallPrompt } from "./InstallPrompt";
import { VitaWordmark } from "@/components/ui/VitaWordmark";
import { UserMenu } from "./UserMenu";

interface AppShellProps {
  user: { id: string; name: string | null; email: string; avatarUrl: string | null; isAdmin?: boolean };
  children: React.ReactNode;
}

const NAV_ITEMS = [
  { href: "/today",  icon: Home,          label: "Today" },
  { href: "/chat",   icon: MessageCircle, label: "Coach" },
  { href: "/month",  icon: Calendar,      label: "Plan" },
  { href: "/goals",  icon: Target,        label: "Goals" },
  { href: "/body",   icon: Sparkles,      label: "Body" },
];

export function AppShell({ user, children }: AppShellProps) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCmdOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const isChat = pathname.startsWith("/chat");
  const isToday = pathname === "/today";
  const isGuest = user.email.startsWith("guest_") && user.email.endsWith("@guest.vita");

  return (
    <div className="min-h-screen flex flex-col bg-bg-base">

      {/* Guest banner */}
      {isGuest && !bannerDismissed && (
        <div className="relative z-30 flex items-center justify-between gap-3 px-5 py-2.5 text-caption border-b border-champagne/15 text-champagne" style={{ background: "rgba(212,196,168,0.06)" }}>
          <span>
            Browsing as a guest.{" "}
            <Link href="/auth/register" className="underline underline-offset-2 hover:text-champagne-soft transition-colors">
              Create a free account
            </Link>{" "}
            to save your progress.
          </span>
          <button onClick={() => setBannerDismissed(true)} className="shrink-0 opacity-60 hover:opacity-100 transition-opacity" aria-label="Dismiss">
            <X size={12} strokeWidth={1.5} />
          </button>
        </div>
      )}

      {/* Top bar */}
      <header className="relative z-20 flex items-center justify-between px-5 h-12 border-b border-border-subtle bg-bg-base">
        <div className="flex items-center gap-3">
          {isChat && (
            <button onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-1.5 rounded text-text-muted hover:text-text-secondary transition-colors">
              {sidebarOpen ? <X size={15} strokeWidth={1.5} /> : <Menu size={15} strokeWidth={1.5} />}
            </button>
          )}
          {/* Wordmark — always brings the user back to /today. On /today
              itself it stays focusable but doesn't navigate anywhere new. */}
          <Link
            href="/today"
            aria-label="Go to today"
            aria-current={isToday ? "page" : undefined}
            className="inline-flex items-center group transition-opacity hover:opacity-80"
          >
            <VitaWordmark className="text-text-primary" />
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setCmdOpen(true)}
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded border border-border-subtle bg-bg-surface text-caption text-text-muted hover:border-border-default hover:text-text-secondary transition-colors"
          >
            <span>Search</span>
            <kbd className="px-1.5 py-0.5 rounded text-[10px] bg-bg-elevated border border-border-subtle font-sans">⌘K</kbd>
          </button>
          <UserMenu user={user} />
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative z-10">
        {/* Chat sidebar */}
        {isChat && (
          <div className={cn(
            "absolute inset-y-0 left-0 z-30 lg:relative lg:block transition-transform duration-200",
            sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
            "w-64 border-r border-border-subtle bg-bg-base",
          )}>
            <ChatSidebar onNavigate={() => setSidebarOpen(false)} />
          </div>
        )}

        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>

      {/* Bottom nav — champagne active underline, not filled icon */}
      <nav className="relative z-20 border-t border-border-subtle bg-bg-base">
        <div className="flex">
          {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
            const active = pathname === href || (href !== "/" && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex-1 flex flex-col items-center gap-1 py-2.5 transition-colors min-h-[44px] justify-center",
                  active ? "text-text-primary" : "text-text-disabled hover:text-text-muted"
                )}
              >
                <Icon size={16} strokeWidth={1.5} />
                <span className="text-[9px] tracking-[0.1em] uppercase font-sans">{label}</span>
                <span className={cn("w-4 h-px transition-all duration-200", active ? "bg-champagne" : "bg-transparent")} />
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
