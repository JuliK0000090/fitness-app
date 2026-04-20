"use client";

import { useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const email = new FormData(e.currentTarget).get("email") as string;
    setLoading(true);
    try {
      await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setSent(true);
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="glass p-8 text-center fu">
        <div className="text-3xl mb-3">📬</div>
        <h1 className="text-xl font-semibold mb-2">Check your inbox</h1>
        <p className="text-sm text-muted-foreground mb-6">
          If that email is registered, we sent a reset link. It expires in 1 hour.
        </p>
        <Link href="/auth/login">
          <Button variant="outline" className="w-full">Back to sign in</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="glass p-8 fu">
      <h1 className="text-xl font-semibold mb-1">Reset your password</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Enter your email and we'll send a reset link.
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" placeholder="you@example.com" required />
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Sending…" : "Send reset link"}
        </Button>
      </form>
      <p className="text-sm text-center text-muted-foreground mt-4">
        <Link href="/auth/login" className="hover:text-primary">Back to sign in</Link>
      </p>
    </div>
  );
}
