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
        className="flex items-center justify-between px-6 py-5 max-w-3xl mx-auto"
        style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 20px)" }}
      >
        <span className="font-serif text-body-lg tracking-[0.18em] lowercase font-light">
          vita
        </span>
        <Link
          href="/auth/login"
          className="text-caption tracking-widest lowercase text-text-muted hover:text-text-primary transition-colors"
        >
          sign in
        </Link>
      </nav>

      {/* ── Hero ────────────────────────────────────────────────────── */}
      <section className="px-6 max-w-3xl mx-auto pt-20 pb-24 md:pt-28 md:pb-28">
        <h1 className="font-serif text-display-2xl font-light leading-[1.02] lowercase">
          i&rsquo;m vita.
        </h1>
        <p className="mt-8 font-serif text-display-sm font-light text-text-secondary leading-snug max-w-[620px] lowercase">
          i remember what you did, how it felt, and what worked. the next session
          learns from the last one.
        </p>
        <div className="mt-10">
          <PrimaryCTA />
        </div>
      </section>

      {/* ── Section 1 — what this is ─────────────────────────────────── */}
      <section className="px-6 max-w-3xl mx-auto py-16 md:py-20">
        <h2 className="font-serif text-display-md font-light leading-tight lowercase">
          a coach that remembers.
        </h2>
        <p className="mt-6 text-body-lg text-text-secondary leading-relaxed max-w-[600px] lowercase">
          most apps log a workout and forget it. i don&rsquo;t. every set, every
          rep, every time you wrote &ldquo;felt heavy&rdquo; — i hold onto that.
          then i use it.
        </p>
        <p className="mt-4 text-body-lg text-text-secondary leading-relaxed max-w-[600px] lowercase">
          when you open me tomorrow, i already know what tuesday looked like.
        </p>
      </section>

      {/* ── Section 2 — three primitives ─────────────────────────────── */}
      <section className="px-6 max-w-3xl mx-auto py-16 md:py-20">
        <div className="grid gap-12 md:grid-cols-3">
          <Primitive
            label="memory."
            body="i keep your record. every session, every note, every PR."
          />
          <Primitive
            label="plan."
            body="i adapt the next workout to the last one. you don't write the program. neither does a stranger."
          />
          <Primitive
            label="trust."
            body="i don't sell your data. i don't shame your streak. i don't put words in your mouth."
          />
        </div>
      </section>

      {/* ── Section 3 — who this is for ──────────────────────────────── */}
      <section className="px-6 max-w-3xl mx-auto py-16 md:py-20">
        <h2 className="font-serif text-display-md font-light leading-tight lowercase">
          built for sarah, ceo.
        </h2>
        <p className="mt-6 text-body-lg text-text-secondary leading-relaxed max-w-[600px] lowercase">
          she trains three to five times a week. she&rsquo;s got a notebook full
          of PRs and a phone full of half-used apps. she reads stacy sims. she
          doesn&rsquo;t want a leaderboard, a community, or another pep talk.
        </p>
        <p className="mt-4 text-body-lg text-text-secondary leading-relaxed max-w-[600px] lowercase">
          she wants a record that gets smarter the longer she uses it.
        </p>
        <p className="mt-4 text-body-lg text-text-primary leading-relaxed max-w-[600px] lowercase">
          if that&rsquo;s you, i&rsquo;ll meet you there.
        </p>
      </section>

      {/* ── Section 4 — what i don't do ──────────────────────────────── */}
      <section className="px-6 max-w-3xl mx-auto py-16 md:py-20">
        <h2 className="font-serif text-display-md font-light leading-tight lowercase">
          what i don&rsquo;t do.
        </h2>
        <ul className="mt-8 space-y-3 text-body-lg text-text-secondary leading-relaxed max-w-[600px] lowercase">
          <li>i won&rsquo;t analyze your body in photos.</li>
          <li>i won&rsquo;t give you a streak to feel guilty about.</li>
          <li>i won&rsquo;t put words in your mouth.</li>
          <li>i won&rsquo;t sell your data.</li>
          <li>i won&rsquo;t pretend i&rsquo;m a doctor.</li>
        </ul>
        <p className="mt-8 text-body-lg text-text-primary leading-relaxed max-w-[600px] lowercase">
          i&rsquo;ll keep your record, plan your next session, and stay quiet when
          you need quiet.
        </p>
      </section>

      {/* ── Section 5 — the lineage ──────────────────────────────────── */}
      <section className="px-6 max-w-3xl mx-auto py-16 md:py-20">
        <h2 className="font-serif text-display-md font-light leading-tight lowercase">
          trained on the women who got there first.
        </h2>
        <p className="mt-6 text-body-lg text-text-secondary leading-relaxed max-w-[600px] lowercase">
          stacy sims on physiology. mary claire haver on metabolism. sara
          gottfried on hormones. rhonda patrick on the science underneath all
          of it.
        </p>
        <p className="mt-4 text-body-lg text-text-primary leading-relaxed max-w-[600px] lowercase">
          i don&rsquo;t invent. i remember, i plan, i cite.
        </p>
      </section>

      {/* ── Section 6 — from juliana ─────────────────────────────────── */}
      <section className="px-6 max-w-3xl mx-auto py-16 md:py-20">
        <p className="text-label tracking-widest lowercase text-text-disabled font-sans font-medium">
          from juliana
        </p>
        <div className="mt-6 font-serif italic text-body-lg text-text-secondary leading-relaxed max-w-[620px] space-y-4 lowercase">
          <p>i&rsquo;m juliana. toronto.</p>
          <p>
            i trained alone for years with a notebook. every fitness app i tried
            treated me like a man with longer hair. so i built the one i wanted.
          </p>
          <p>
            vita is the coach i wish i&rsquo;d had. it remembers what you
            did. it plans the next one. it doesn&rsquo;t shame you when life
            gets in the way.
          </p>
          <p>
            if you&rsquo;ve ever closed an app because it spoke to you like a
            stranger — try this one.
          </p>
          <p className="not-italic">— juliana</p>
        </div>
      </section>

      {/* ── Section 7 — the close ────────────────────────────────────── */}
      <section className="px-6 max-w-3xl mx-auto py-20 md:py-28">
        <h2 className="font-serif text-display-md font-light leading-tight lowercase">
          start with one session.
        </h2>
        <p className="mt-6 text-body-lg text-text-secondary leading-relaxed max-w-[600px] lowercase">
          log it. tell me how it felt. i&rsquo;ll take it from there.
        </p>
        <div className="mt-10">
          <PrimaryCTA />
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────── */}
      <footer className="px-6 max-w-3xl mx-auto pt-12 pb-10 border-t border-border-subtle">
        <p className="font-serif italic text-body text-text-muted lowercase">
          made in toronto. quiet by design. — vita
        </p>
        <div className="mt-6 flex items-center gap-6 text-caption text-text-disabled lowercase">
          <Link href="/legal/privacy" className="hover:text-text-secondary transition-colors">privacy</Link>
          <Link href="/legal/terms" className="hover:text-text-secondary transition-colors">terms</Link>
          <Link href="mailto:juliana.kolarski@gmail.com" className="hover:text-text-secondary transition-colors">contact</Link>
        </div>
      </footer>
    </div>
  );
}

function PrimaryCTA() {
  return (
    <Link
      href="/auth/register"
      className="inline-flex items-center gap-2 px-6 py-3 rounded bg-champagne text-champagne-fg text-body font-medium hover:bg-champagne-soft transition-colors lowercase"
    >
      start — about 60 seconds
    </Link>
  );
}

function Primitive({ label, body }: { label: string; body: string }) {
  return (
    <div className="space-y-3">
      <p className="font-serif text-display-sm font-light text-text-primary leading-tight lowercase">
        {label}
      </p>
      <p className="text-body text-text-secondary leading-relaxed lowercase">
        {body}
      </p>
    </div>
  );
}
