import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import Link from "next/link";

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
      <section className="px-6 max-w-3xl mx-auto pt-20 pb-24 md:pt-32 md:pb-32">
        <p className="text-label tracking-widest uppercase text-champagne font-sans font-medium">
          A new kind of trainer
        </p>
        <h1 className="mt-6 font-serif text-display-2xl font-light leading-[1.02] tracking-tight">
          Your body is already&nbsp;talking.
          <span className="block text-text-secondary">Vita is the one that listens.</span>
        </h1>
        <p className="mt-8 text-body-lg text-text-secondary leading-relaxed max-w-[520px]">
          Sleep, recovery, strain, weight, body fat, heart rate, steps — every
          sensor on your wrist, your finger, and your scale broadcasts a
          signal. Vita is the private intelligence that turns that signal into
          tomorrow&rsquo;s plan.
        </p>
        <div className="mt-10 flex flex-wrap items-center gap-4">
          <Link
            href="/auth/register"
            className="px-6 py-3 rounded bg-champagne text-champagne-fg text-body font-medium hover:bg-champagne-soft transition-colors"
          >
            Start free
          </Link>
          <Link
            href="#how"
            className="px-6 py-3 rounded border border-border-default text-text-secondary text-body hover:border-champagne hover:text-text-primary transition-colors"
          >
            See how she thinks
          </Link>
        </div>
      </section>

      <hr className="max-w-3xl mx-auto border-0 h-px bg-border-subtle" />

      {/* ── Connect ─────────────────────────────────────────────────── */}
      <section className="px-6 max-w-3xl mx-auto py-20 md:py-28">
        <p className="text-label tracking-widest uppercase text-text-disabled font-sans font-medium">
          Connect once
        </p>
        <h2 className="mt-4 font-serif text-display-md font-light leading-tight">
          Every device you already&nbsp;own.
        </h2>
        <p className="mt-6 text-body-lg text-text-secondary leading-relaxed max-w-[560px]">
          One tap to authorize. Vita pulls the last ninety days and keeps
          syncing in the background. No CSV exports. No manual entry. No
          screenshots of last night&rsquo;s sleep score.
        </p>

        <ul className="mt-10 grid grid-cols-2 sm:grid-cols-3 gap-x-8 gap-y-3 text-body text-text-secondary">
          <Provider name="Apple Health" />
          <Provider name="Oura" />
          <Provider name="Whoop" />
          <Provider name="Garmin" />
          <Provider name="Fitbit" />
          <Provider name="Withings" />
          <Provider name="Polar" />
          <Provider name="Samsung Health" />
          <Provider name="Google Fit" />
          <Provider name="Strava" />
          <Provider name="Smart scales" />
          <Provider name="More on the way" muted />
        </ul>
      </section>

      <hr className="max-w-3xl mx-auto border-0 h-px bg-border-subtle" />

      {/* ── How she thinks ──────────────────────────────────────────── */}
      <section id="how" className="px-6 max-w-3xl mx-auto py-20 md:py-28">
        <p className="text-label tracking-widest uppercase text-text-disabled font-sans font-medium">
          How she thinks
        </p>
        <h2 className="mt-4 font-serif text-display-md font-light leading-tight">
          Signals in. A better tomorrow&nbsp;out.
        </h2>
        <p className="mt-6 text-body-lg text-text-secondary leading-relaxed max-w-[560px]">
          Most apps draw you a chart and walk away. Vita reads the chart,
          remembers what worked last cycle, and rewrites tomorrow before you
          ask.
        </p>
        <div className="mt-12 grid gap-10 md:grid-cols-3">
          <Reading
            metric="Sleep down 12%"
            response="Heavy lift moved to Thursday. Today becomes mobility and a walk."
          />
          <Reading
            metric="HRV trending up"
            response="She adds the harder progression. You feel why before she explains it."
          />
          <Reading
            metric="Scale up, body fat down"
            response="She tells you it&rsquo;s muscle and water — and holds the line on the goal."
          />
        </div>
      </section>

      <hr className="max-w-3xl mx-auto border-0 h-px bg-border-subtle" />

      {/* ── Outcome ─────────────────────────────────────────────────── */}
      <section className="px-6 max-w-3xl mx-auto py-20 md:py-28">
        <p className="text-label tracking-widest uppercase text-text-disabled font-sans font-medium">
          Outcomes, not inputs
        </p>
        <h2 className="mt-4 font-serif text-display-md font-light leading-tight">
          The plan moves around your&nbsp;life.
          <span className="block text-text-secondary">The goal doesn&rsquo;t.</span>
        </h2>
        <p className="mt-6 text-body-lg text-text-secondary leading-relaxed max-w-[560px]">
          Bad sleep, travel, a flu, a treatment week — Vita rewrites the week,
          never the destination. You see a trajectory, not a streak. A waist
          measurement on a date you can name. A back squat on a date you can
          name. The number that matters, when it matters.
        </p>
        <div className="mt-12">
          <Link
            href="/auth/register"
            className="inline-block px-6 py-3 rounded bg-champagne text-champagne-fg text-body font-medium hover:bg-champagne-soft transition-colors"
          >
            Start free
          </Link>
          <p className="mt-4 text-caption tracking-widest uppercase text-text-disabled">
            Private by default · Your data stays yours
          </p>
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

function Provider({ name, muted = false }: { name: string; muted?: boolean }) {
  return (
    <li
      className={
        muted
          ? "font-serif text-body font-light text-text-disabled italic"
          : "font-serif text-body font-light text-text-primary"
      }
    >
      {name}
    </li>
  );
}

function Reading({ metric, response }: { metric: string; response: string }) {
  return (
    <div className="space-y-3">
      <p className="text-caption tracking-widest uppercase text-champagne font-sans font-medium">
        {metric}
      </p>
      <p className="font-serif text-heading-md font-light text-text-primary leading-snug">
        {response}
      </p>
    </div>
  );
}
