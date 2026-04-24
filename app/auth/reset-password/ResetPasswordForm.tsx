"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function ResetPasswordForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token");
  const [loading, setLoading] = useState(false);

  if (!token) {
    return (
      <div className="border border-border-subtle bg-bg-surface rounded-md p-8 text-center space-y-4">
        <p className="text-body-sm text-terracotta">Invalid reset link.</p>
        <Link href="/auth/forgot-password">
          <Button variant="secondary" className="w-full">Request a new one</Button>
        </Link>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const password = fd.get("password") as string;
    if (password !== fd.get("confirmPassword")) {
      toast.error("Passwords don't match");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Reset failed");
      toast.success("Password updated. Sign in with your new password.");
      router.push("/auth/login");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Reset failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="border border-border-subtle bg-bg-surface rounded-md p-8 space-y-6">
      <div>
        <h1 className="font-serif text-heading-lg font-light text-text-primary">Choose a new password</h1>
        <p className="text-caption text-text-muted mt-1">At least 8 characters, 1 uppercase, 1 number.</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="password" className="text-caption text-text-muted">New password</label>
          <Input id="password" name="password" type="password" required autoComplete="new-password" />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="confirmPassword" className="text-caption text-text-muted">Confirm new password</label>
          <Input id="confirmPassword" name="confirmPassword" type="password" required autoComplete="new-password" />
        </div>
        <Button type="submit" variant="primary" className="w-full" disabled={loading}>
          {loading ? "Updating…" : "Update password"}
        </Button>
      </form>
    </div>
  );
}
