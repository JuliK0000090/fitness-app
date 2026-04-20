"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { CommandDialog, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { Home, MessageSquare, Activity, Trophy, User, Settings, LogOut } from "lucide-react";

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

const PAGES = [
  { label: "Today", href: "/today", icon: Home },
  { label: "Coach", href: "/chat", icon: MessageSquare },
  { label: "Body", href: "/body", icon: Activity },
  { label: "Level", href: "/level", icon: Trophy },
  { label: "Profile", href: "/profile", icon: User },
  { label: "Settings", href: "/settings", icon: Settings },
  { label: "Goals", href: "/goals", icon: Trophy },
  { label: "Week", href: "/week", icon: Home },
  { label: "Library", href: "/library", icon: Home },
];

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const router = useRouter();

  // Open on ⌘K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        onClose(); // toggle
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  function navigate(href: string) {
    router.push(href);
    onClose();
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/auth/login");
    onClose();
  }

  return (
    <CommandDialog open={open} onOpenChange={(o) => !o && onClose()}>
      <CommandInput placeholder="Go to… or type a command" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Pages">
          {PAGES.map(({ label, href, icon: Icon }) => (
            <CommandItem key={href} onSelect={() => navigate(href)}>
              <Icon size={14} className="mr-2 opacity-70" />
              {label}
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandGroup heading="Actions">
          <CommandItem onSelect={logout}>
            <LogOut size={14} className="mr-2 opacity-70" />
            Sign out
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
