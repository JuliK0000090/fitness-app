"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
    <div className="glass p-8 fu">
      <h1 className="text-xl font-semibold mb-1">Welcome back</h1>
      <p className="text-sm text-muted-foreground mb-6">Sign in to your Vita account</p>

      {params.get("error") === "invalid_token" && (
        <p className="text-sm text-destructive mb-4 glass p-3 rounded-lg">
          This link is invalid or has expired. Please try again.
        </p>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {!mfaRequired ? (
          <>
            <div className="space-y-1">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" placeholder="you@example.com" required autoComplete="email" defaultValue={pendingData?.email} />
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link href="/auth/forgot-password" className="text-xs text-muted-foreground hover:text-primary">Forgot password?</Link>
              </div>
              <Input id="password" name="password" type="password" placeholder="Your password" required autoComplete="current-password" defaultValue={pendingData?.password} />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="rememberMe" name="rememberMe" className="rounded border-border" />
              <Label htmlFor="rememberMe" className="text-sm font-normal cursor-pointer">Remember me for 30 days</Label>
            </div>
          </>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Enter the 6-digit code from your authenticator app.</p>
            <Label htmlFor="totpCode">Authenticator code</Label>
            <Input id="totpCode" name="totpCode" type="text" inputMode="numeric" pattern="\d{6}" maxLength={6} placeholder="000000" required autoFocus />
            <button type="button" onClick={() => setMfaRequired(false)} className="text-xs text-muted-foreground hover:text-primary">Back</button>
          </div>
        )}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Signing in…" : mfaRequired ? "Verify code" : "Sign in"}
        </Button>
      </form>

      <p className="text-sm text-center text-muted-foreground mt-4">
        New to Vita? <Link href="/auth/register" className="text-primary underline">Create account</Link>
      </p>

      <div className="relative my-4">
        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
        <div className="relative flex justify-center"><span className="bg-card px-3 text-xs text-muted-foreground">or</span></div>
      </div>

      <GuestButton />
    </div>
  );
}
