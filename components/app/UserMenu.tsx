"use client";

/**
 * Avatar-button dropdown in the top-right of the app shell.
 *
 * Tap the avatar -> small overview menu opens with the user's name +
 * email at the top, then a curated set of "everything that isn't in
 * the bottom nav" links: profile, settings hubs, partner, then admin
 * if applicable, then sign out.
 *
 * Closes on: click outside, Escape, route change (handled by Next's
 * Link navigation re-rendering the page).
 *
 * Designed restrained: no gradients, no shadows beyond a single faint
 * border, generous spacing, Lucide icons at 13px, mobile-friendly tap
 * targets.
 */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  User as UserIcon, Settings, BellRing, ShieldAlert, Users, Brain,
  Shield, Heart, LogOut, Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Props = {
  user: { name: string | null; email: string; avatarUrl: string | null; isAdmin?: boolean };
};

export function UserMenu({ user }: Props) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const initial = (user.name?.[0] ?? user.email[0]).toUpperCase();
  const displayName = user.name?.trim() || user.email.split("@")[0];

  // Click outside closes
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function signOut() {
    setOpen(false);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/auth/login");
      router.refresh();
    } catch {
      toast.error("Could not sign out — try again");
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Open menu"
        aria-haspopup="menu"
        aria-expanded={open}
        className={cn(
          "w-7 h-7 rounded-full border flex items-center justify-center text-caption font-medium transition-colors",
          open
            ? "border-champagne text-champagne"
            : "border-border-default text-text-muted hover:border-border-strong hover:text-text-secondary",
        )}
      >
        {user.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
        ) : (
          initial
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-9 z-50 min-w-[260px] border border-border-default bg-bg-surface rounded-md overflow-hidden"
          style={{ boxShadow: "0 4px 24px rgba(0,0,0,0.4)" }}
        >
          {/* Header */}
          <div className="px-4 py-3 border-b border-border-subtle">
            <p className="text-body-sm font-medium text-text-primary truncate">{displayName}</p>
            <p className="text-caption text-text-muted truncate">{user.email}</p>
          </div>

          {/* Primary group */}
          <div className="py-1">
            <Item href="/profile"  Icon={UserIcon}     label="Profile"           onNavigate={() => setOpen(false)} />
            <Item href="/settings" Icon={Settings}     label="Settings"          onNavigate={() => setOpen(false)} />
          </div>

          <Divider />

          {/* Plan + integrations group */}
          <div className="py-1">
            <Item href="/settings/plan"        Icon={Activity}    label="Plan health"        onNavigate={() => setOpen(false)} />
            <Item href="/settings/constraints" Icon={ShieldAlert} label="Constraints"        onNavigate={() => setOpen(false)} />
            <Item href="/settings/partner"     Icon={Users}       label="Accountability partner" onNavigate={() => setOpen(false)} />
            <Item href="/settings/notifications" Icon={BellRing}  label="Notifications"      onNavigate={() => setOpen(false)} />
            <Item href="/settings/wearables"   Icon={Heart}       label="Wearables"          onNavigate={() => setOpen(false)} />
          </div>

          <Divider />

          {/* Privacy / memory group */}
          <div className="py-1">
            <Item href="/settings/memory"  Icon={Brain}  label="Memory"           onNavigate={() => setOpen(false)} />
            <Item href="/settings/privacy" Icon={Shield} label="Privacy & data"   onNavigate={() => setOpen(false)} />
          </div>

          {user.isAdmin && (
            <>
              <Divider />
              <div className="py-1">
                <p className="px-4 pt-1 pb-0.5 text-[9px] tracking-widest uppercase text-text-disabled">Admin</p>
                <Item href="/admin/users"     Icon={Users}    label="Users"        onNavigate={() => setOpen(false)} />
                <Item href="/admin/integrity" Icon={Activity} label="System health" onNavigate={() => setOpen(false)} />
              </div>
            </>
          )}

          <Divider />

          {/* Sign out */}
          <div className="py-1">
            <button
              onClick={signOut}
              className="w-full flex items-center gap-3 px-4 py-2 text-body-sm text-text-muted hover:text-terracotta hover:bg-bg-elevated transition-colors"
              role="menuitem"
            >
              <LogOut size={13} strokeWidth={1.5} />
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Item({
  href, Icon, label, onNavigate,
}: {
  href: string;
  Icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  label: string;
  onNavigate: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      role="menuitem"
      className="flex items-center gap-3 px-4 py-2 text-body-sm text-text-secondary hover:bg-bg-elevated hover:text-text-primary transition-colors"
    >
      <Icon size={13} strokeWidth={1.5} className="text-text-muted shrink-0" />
      <span className="truncate">{label}</span>
    </Link>
  );
}

function Divider() {
  return <div className="h-px bg-border-subtle" />;
}
