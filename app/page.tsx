import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import Link from "next/link";

/**
 * Public landing page for unauthenticated visitors. Single screen on
 * desktop, light scroll on mobile. Pure typography on the existing
 * design tokens — no images.
 *
 * The four sections (hero, founder note, how-it-works, pricing) use
 * the same restrained voice as the app: short sentences, observational,
 * no exclamation, no emoji. Sections separated by champagne rules
 * rather than page breaks so the eye flows.
 */
export default async function HomePage() {
  const session = await getSession();
  if (session) redirect("/today");

  return (
    <div className="min-h-screen bg-bg-base text-text-primary">
      {/* ── Top nav ─────────────────────────────────────────────────── */}
      <nav
        className="flex items-center justify-between px-6 py-5 max-w-5xl mx-auto"
        style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 20px)" }}
      >
        <span className="font-serif text-body-lg tracking-[0.22em] uppercase font-light">
          Vita
        </span>
        <div className="flex items-center gap-6">
          <Link
            href="/auth/login"
            className="text-caption tracking-widest uppercase text-text-muted hover:text-text-primary transition-colors"
          >
            Sign in
          </Link>
          <Link
            href="/auth/register"
            className="text-caption tracking-widest uppercase px-4 py-2 rounded border border-border-default text-text-secondary hover:border-champagne hover:text-text-primary transition-colors"
          >
            Get started
          </Link>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────────────────── */}
      <section className="px-6 max-w-3xl mx-auto pt-16 pb-20 md:pt-24 md:pb-28">
        <h1 className="font-serif text-display-2xl font-light leading-tight">
          A private trainer who remembers you.
        </h1>
        <p className="mt-6 text-body-lg text-text-secondary leading-relaxed max-w-[480px]">
          Vita is your AI personal trainer for fitness, lifestyle, and longevity
          goals. Personalized plans built from your own data — adjusting when
          life changes and quietly anticipating what you need.
        </p>
        <div className="mt-10 flex flex-wrap items-center gap-4">
          <Link
            href="/auth/register"
            className="px-6 py-3 rounded bg-champagne text-champagne-fg text-body font-medium hover:bg-champagne-soft transition-colors"
          >
            Start your trial
          </Link>
          <Link
            href="#how-it-works"
            className="px-6 py-3 rounded border border-border-default text-text-secondary text-body hover:border-champagne hover:text-text-primary transition-colors"
          >
            How it works
          </Link>
        </div>
      </section>

      <hr className="max-w-3xl mx-auto border-0 h-px bg-border-subtle" />

      {/* ── Founder note ────────────────────────────────────────────── */}
      <section className="px-6 max-w-3xl mx-auto py-20 md:py-28">
        <p className="text-label tracking-widest uppercase text-text-disabled font-sans font-medium">
          From the founder
        </p>
        <blockquote className="mt-6 font-serif text-display-md font-light leading-snug">
          &ldquo;I built Vita because nothing in the App Store understood the
          way I actually train.&rdquo;
        </blockquote>
        {/*
          TODO: INSERT FOUNDER NOTE — Juliana to fill in. ~100 words on:
            - The journey (training history, what she tried)
            - The gap she saw (what existing apps got wrong for her)
            - What she's building (Vita's promise: memory, restraint,
              wearable trust, voice)
          Voice: first-person, restrained, no marketing puff. Sign with
          "— Juliana, Toronto" at the end.
        */}
        <p className="mt-6 text-body-lg text-text-secondary leading-relaxed max-w-[600px]">
          [Founder note coming. A short piece on the journey from training
          alone with a notebook to building Vita — what changed when I
          stopped logging numbers and started talking to a coach who
          remembered me.]
        </p>
        <p className="mt-6 text-caption text-text-muted">
          Juliana, founder · Toronto
        </p>
      </section>

      <hr className="max-w-3xl mx-auto border-0 h-px bg-border-subtle" />

      {/* ── How it works ────────────────────────────────────────────── */}
      <section id="how-it-works" className="px-6 max-w-3xl mx-auto py-20 md:py-28">
        <p className="text-label tracking-widest uppercase text-text-disabled font-sans font-medium">
          How it works
        </p>
        <h2 className="mt-4 font-serif text-display-md font-light">Three steps.</h2>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          <Step
            num="01"
            title="Tell Vita what you want."
            body="One sentence. Voice or text. She parses your goal and asks two questions to make it concrete."
          />
          <Step
            num="02"
            title="She builds your week."
            body="Workouts, habits, goal trajectory. All on a calendar that respects how you actually live."
          />
          <Step
            num="03"
            title="She adjusts when things change."
            body="Bad sleep, travel, treatments — automatic. The plan moves around the constraint, not over it."
          />
        </div>
      </section>

      <hr className="max-w-3xl mx-auto border-0 h-px bg-border-subtle" />

      {/* ── Pricing ─────────────────────────────────────────────────── */}
      <section className="px-6 max-w-3xl mx-auto py-20 md:py-28">
        <p className="text-label tracking-widest uppercase text-text-disabled font-sans font-medium">
          Pricing
        </p>
        <h2 className="mt-4 font-serif text-display-md font-light">
          One plan. $14.99/month or $119/year.
        </h2>
        <p className="mt-6 text-body-lg text-text-secondary leading-relaxed max-w-[520px]">
          No free tier yet. Cancel anytime. Privacy-first — your data is
          yours.
        </p>
        <div className="mt-10">
          <Link
            href="/auth/register"
            className="inline-block px-6 py-3 rounded bg-champagne text-champagne-fg text-body font-medium hover:bg-champagne-soft transition-colors"
          >
            Start your trial
          </Link>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────── */}
      <footer className="px-6 max-w-3xl mx-auto py-10 border-t border-border-subtle">
        <div className="flex items-center gap-6 text-caption text-text-muted">
          <Link href="/legal/privacy" className="hover:text-text-secondary transition-colors">Privacy</Link>
          <Link href="/legal/terms" className="hover:text-text-secondary transition-colors">Terms</Link>
          <Link href="mailto:juliana.kolarski@gmail.com" className="hover:text-text-secondary transition-colors">Contact</Link>
        </div>
      </footer>
    </div>
  );
}

function Step({ num, title, body }: { num: string; title: string; body: string }) {
  return (
    <div className="space-y-2">
      <p className="text-caption tracking-widest uppercase text-champagne font-sans font-medium">
        {num}
      </p>
      <p className="font-serif text-heading-md font-light text-text-primary leading-snug">
        {title}
      </p>
      <p className="text-body text-text-secondary leading-relaxed">{body}</p>
    </div>
  );
}
