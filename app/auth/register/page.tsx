"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { GuestButton } from "@/components/auth/GuestButton";

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const data = {
      name: fd.get("name") as string,
      email: fd.get("email") as string,
      dob: fd.get("dob") as string,
      password: fd.get("password") as string,
    };

    if (data.password !== fd.get("confirmPassword")) {
      toast.error("Passwords don't match");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Registration failed");
      toast.success("Account created! Check your email to verify.");
      router.push("/onboarding");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="border border-border-subtle bg-bg-surface rounded-md p-8 space-y-6">
      <div>
        <h1 className="font-serif text-heading-lg font-light text-text-primary">Create your account</h1>
        <p className="text-caption text-text-muted mt-1">Start your journey with Vita</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="name" className="text-caption text-text-muted">Name</label>
          <Input id="name" name="name" placeholder="Your name" required autoComplete="name" />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="email" className="text-caption text-text-muted">Email</label>
          <Input id="email" name="email" type="email" placeholder="you@example.com" required autoComplete="email" />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="dob" className="text-caption text-text-muted">Date of birth</label>
          <Input id="dob" name="dob" type="date" required />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="password" className="text-caption text-text-muted">Password</label>
          <Input id="password" name="password" type="password" placeholder="Min 8 chars, 1 uppercase, 1 number" required autoComplete="new-password" />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="confirmPassword" className="text-caption text-text-muted">Confirm password</label>
          <Input id="confirmPassword" name="confirmPassword" type="password" placeholder="Repeat password" required autoComplete="new-password" />
        </div>

        <p className="text-caption text-text-disabled">
          By registering you agree to our{" "}
          <Link href="/legal/terms" className="text-champagne/70 hover:text-champagne transition-colors underline underline-offset-2">Terms</Link>
          {" "}and{" "}
          <Link href="/legal/privacy" className="text-champagne/70 hover:text-champagne transition-colors underline underline-offset-2">Privacy Policy</Link>.
        </p>

        <Button type="submit" variant="primary" className="w-full" disabled={loading}>
          {loading ? "Creating account…" : "Create account"}
        </Button>
      </form>

      <p className="text-caption text-center text-text-muted">
        Already have an account?{" "}
        <Link href="/auth/login" className="text-champagne hover:text-champagne-soft transition-colors">
          Sign in
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
