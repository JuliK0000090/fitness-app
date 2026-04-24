"use client";

import { useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
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
      <div className="border border-border-subtle bg-bg-surface rounded-md p-8 text-center space-y-5">
        <div className="space-y-2">
          <h1 className="font-serif text-heading-lg font-light text-text-primary">Check your inbox</h1>
          <p className="text-caption text-text-muted">
            If that email is registered, we sent a reset link. It expires in 1 hour.
          </p>
        </div>
        <Link href="/auth/login">
          <Button variant="secondary" className="w-full">Back to sign in</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="border border-border-subtle bg-bg-surface rounded-md p-8 space-y-6">
      <div>
        <h1 className="font-serif text-heading-lg font-light text-text-primary">Reset password</h1>
        <p className="text-caption text-text-muted mt-1">
          Enter your email and we'll send a reset link.
        </p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="email" className="text-caption text-text-muted">Email</label>
          <Input id="email" name="email" type="email" placeholder="you@example.com" required />
        </div>
        <Button type="submit" variant="primary" className="w-full" disabled={loading}>
          {loading ? "Sending…" : "Send reset link"}
        </Button>
      </form>
      <p className="text-caption text-center text-text-muted">
        <Link href="/auth/login" className="text-champagne hover:text-champagne-soft transition-colors">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
