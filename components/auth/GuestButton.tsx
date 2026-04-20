"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function GuestButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleGuest() {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/guest", { method: "POST" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      window.location.href = "/today";
    } catch (err) {
      toast.error(err instanceof Error ? `Error: ${err.message}` : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      className="w-full"
      onClick={handleGuest}
      disabled={loading}
    >
      {loading ? "Starting…" : "Continue as guest"}
    </Button>
  );
}
