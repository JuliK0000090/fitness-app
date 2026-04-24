"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { GuestButton } from "@/components/auth/GuestButton";

export default function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [mfaRequired, setMfaRequired] = useState(false);
  const [pendingData, setPendingData] = useState<Record<string, string> | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const data: Record<string, string | boolean> = {
      email: fd.get("email") as string,
      password: fd.get("password") as string,
      rememberMe: fd.get("rememberMe") === "on",
    };
    if (mfaRequired && fd.get("totpCode")) {
      data.totpCode = fd.get("totpCode") as string;
    }

    setLoading(true);
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(tz ? { "X-Timezone": tz } : {}) },
        body: JSON.stringify(data),
      });
      const json = await res.json();

      if (res.status === 403 && json.error === "mfa_required") {
        setMfaRequired(true);
        setPendingData({ email: data.email as string, password: data.password as string });
        setLoading(false);
        return;
      }

      if (!res.ok) throw new Error(json.error ?? "Login failed");
      router.push(params.get("next") ?? "/today");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="border border-border-subtle bg-bg-surface rounded-md p-8 space-y-6">
      <div>
        <h1 className="font-serif text-heading-lg font-light text-text-primary">Welcome back</h1>
        <p className="text-caption text-text-muted mt-1">Sign in to your Vita account</p>
      </div>

      {params.get("error") === "invalid_token" && (
        <p className="text-caption text-terracotta border border-terracotta/20 bg-terracotta-soft/40 rounded px-3 py-2">
          This link is invalid or has expired. Please try again.
        </p>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {!mfaRequired ? (
          <>
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-caption text-text-muted">Email</label>
              <Input id="email" name="email" type="email" placeholder="you@example.com" required autoComplete="email" defaultValue={pendingData?.email} />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="text-caption text-text-muted">Password</label>
                <Link href="/auth/forgot-password" className="text-caption text-text-disabled hover:text-text-muted transition-colors">Forgot password?</Link>
              </div>
              <Input id="password" name="password" type="password" placeholder="Your password" required autoComplete="current-password" defaultValue={pendingData?.password} />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" id="rememberMe" name="rememberMe" className="rounded border-border-default accent-champagne" />
              <span className="text-caption text-text-muted">Remember me for 30 days</span>
            </label>
          </>
        ) : (
          <div className="space-y-3">
            <p className="text-caption text-text-muted">Enter the 6-digit code from your authenticator app.</p>
            <div className="space-y-1.5">
              <label htmlFor="totpCode" className="text-caption text-text-muted">Authenticator code</label>
              <Input id="totpCode" name="totpCode" type="text" inputMode="numeric" pattern="\d{6}" maxLength={6} placeholder="000000" required autoFocus />
            </div>
            <button type="button" onClick={() => setMfaRequired(false)} className="text-caption text-text-disabled hover:text-text-muted transition-colors">Back</button>
          </div>
        )}

        <Button type="submit" variant="primary" className="w-full" disabled={loading}>
          {loading ? "Signing in…" : mfaRequired ? "Verify code" : "Sign in"}
        </Button>
      </form>

      <p className="text-caption text-center text-text-muted">
        New to Vita?{" "}
        <Link href="/auth/register" className="text-champagne hover:text-champagne-soft transition-colors">
          Create account
        </Link>
      </p>

      <div className="relative">
        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border-subtle" /></div>
        <div className="relative flex justify-center">
          <span className="bg-bg-surface px-3 text-caption text-text-disabled">or</span>
        </div>
      </div>

      <GuestButton />
    </div>
  );
}
