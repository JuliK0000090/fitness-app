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
      if (!res.ok) throw new Error("Failed to start guest session");
      router.push("/today");
    } catch {
      toast.error("Could not start guest session. Please try again.");
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
