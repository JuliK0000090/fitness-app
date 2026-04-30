"use client";

import { useState } from "react";
import { toast } from "sonner";

/**
 * Body page placeholder while the rendered Vita-You avatar is on hold.
 *
 * Same dimensions as the previous AvatarPanel so the page layout doesn't
 * shift. Single CTA writes to AvatarWaitlist.
 */
export function AvatarComingSoon({ alreadyOnList }: { alreadyOnList: boolean }) {
  const [joining, setJoining] = useState(false);
  const [joined, setJoined] = useState(alreadyOnList);

  async function joinWaitlist() {
    setJoining(true);
    try {
      const res = await fetch("/api/avatar/waitlist", { method: "POST" });
      if (!res.ok) throw new Error("waitlist join failed");
      setJoined(true);
      toast.success("On the list. Vita will tell you when it ships.");
    } catch {
      toast.error("Couldn't save that — try again in a moment.");
    } finally {
      setJoining(false);
    }
  }

  return (
    <div className="border border-border-subtle rounded-md bg-bg-surface px-6 py-10 space-y-5">
      <p className="text-label tracking-widest uppercase text-text-disabled font-sans font-medium">
        Vita You
      </p>
      <p className="text-body text-text-secondary leading-relaxed">
        Your private avatar is coming. Vita will render a stylized version of
        your progress over time — never a photo, never a comparison.
      </p>
      {joined ? (
        <p className="text-caption text-text-muted">
          You&apos;re on the list. Vita will tell you when it ships.
        </p>
      ) : (
        <button
          onClick={joinWaitlist}
          disabled={joining}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded bg-champagne text-champagne-fg text-body-sm font-medium hover:bg-champagne-soft disabled:opacity-50 transition-colors"
        >
          {joining ? "Saving…" : "Notify me when it's ready"}
        </button>
      )}
    </div>
  );
}
