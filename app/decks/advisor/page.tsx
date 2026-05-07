import "../deck.css";
import { requireDeckAccess, DeckToolbar, Token } from "../lib";

/**
 * Advisor deck — for cold/warm outreach to clinical, research, and
 * sports-science authorities (Stacy Sims, Mary Claire Haver, Sara
 * Gottfried, sports-medicine physicians). 8 slides. Personalization
 * tokens render in terracotta and must be replaced inline before
 * sending. Search this file for "<Token>" to find them.
 */

export const dynamic = "force-dynamic";
export const metadata = { title: "Vita — advisor deck", robots: "noindex" };

export default async function AdvisorDeckPage() {
  await requireDeckAccess();

  return (
    <main>
      <DeckToolbar tokensRemaining />

      {/* ── Slide 1 · Cover ─────────────────────────────────────────── */}
      <section className="deck-slide">
        <div className="deck-slide-content text-center space-y-12">
          <p className="font-serif text-display-2xl font-light tracking-[0.18em]">VITA</p>
          <p className="font-serif text-display-sm font-light text-text-secondary leading-snug max-w-[640px] mx-auto">
            A private trainer who remembers you.
          </p>
          <div className="pt-24">
            <p className="text-caption tracking-widest uppercase text-text-disabled text-left">
              Advisor brief · Juliana, founder · Toronto
            </p>
          </div>
        </div>
      </section>

      {/* ── Slide 2 · Why I built this ──────────────────────────────── */}
      <section className="deck-slide">
        <div className="deck-slide-content space-y-8">
          <p className="text-label tracking-widest uppercase font-sans font-medium" style={{ color: "#D4C4A8" }}>
            Why I built this
          </p>
          <h1 className="font-serif text-display-md font-light leading-tight">
            I&apos;m Juliana. Toronto. I trained alone for years with a notebook and a quiet feeling that nothing I downloaded actually understood me.
          </h1>
          <div className="space-y-5 text-body-lg text-text-secondary leading-relaxed">
            <p>
              I&apos;m the user. Lean and strong, hot pilates three times a
              week, hot yoga on Sundays, walking everywhere. Wedding prep on
              the calendar, two treatments a year that change everything for
              a fortnight, and a body I want to know rather than punish.
            </p>
            <p>
              Every fitness app I tried treated me like a man with longer
              hair. Volume targets. Streaks I couldn&apos;t recover from.
              Charts that ignored sleep. Nothing that recognised a hormone
              cycle, a treatment week, a quiet decision to take the
              afternoon off.
            </p>
            <p>
              So I built Vita. The trainer I needed. Memory, restraint,
              wearable trust, voice that sounds like a friend who knows
              your numbers.
            </p>
          </div>
        </div>
      </section>

      {/* ── Slide 3 · What Vita is ──────────────────────────────────── */}
      <section className="deck-slide">
        <div className="deck-slide-content space-y-10">
          <p className="text-label tracking-widest uppercase font-sans font-medium" style={{ color: "#D4C4A8" }}>
            What Vita is
          </p>
          <h2 className="font-serif text-display-sm font-light leading-snug">
            An AI private trainer that:
          </h2>
          <ul className="space-y-4 text-body-lg text-text-secondary leading-relaxed">
            <li className="flex gap-4">
              <span className="text-text-disabled select-none">—</span>
              <span>Remembers you. Goals, treatments, what you said three weeks ago, why Tuesday is hard.</span>
            </li>
            <li className="flex gap-4">
              <span className="text-text-disabled select-none">—</span>
              <span>Plans your week. Workouts, habits, goal trajectory — on a calendar that respects how you actually live.</span>
            </li>
            <li className="flex gap-4">
              <span className="text-text-disabled select-none">—</span>
              <span>Adjusts when life moves. Bad sleep, travel, treatments, a missed Tuesday — automatic, not punitive.</span>
            </li>
            <li className="flex gap-4">
              <span className="text-text-disabled select-none">—</span>
              <span>Listens to your wearable. Apple Health today, Oura/Whoop/Garmin shortly. Steps and HRV inform the plan, not the other way round.</span>
            </li>
            <li className="flex gap-4">
              <span className="text-text-disabled select-none">—</span>
              <span>Speaks one voice. Restrained, warm, direct. No streak shame. No public leaderboards. No emoji.</span>
            </li>
          </ul>
          <p className="text-caption text-text-secondary pt-6">
            Currently shipping to early users in Canada and the US. Built solo over the last six months.
          </p>
        </div>
      </section>

      {/* ── Slide 4 · The gap ───────────────────────────────────────── */}
      <section className="deck-slide">
        <div className="deck-slide-content space-y-10">
          <p className="text-label tracking-widest uppercase font-sans font-medium" style={{ color: "#D4C4A8" }}>
            The gap I&apos;m building into
          </p>
          <h2 className="font-serif text-display-md font-light leading-tight">
            Every major fitness AI was designed by men for men.
          </h2>
          <ul className="space-y-4 text-body-lg text-text-secondary leading-relaxed">
            <li className="flex gap-4">
              <span className="text-text-disabled select-none">—</span>
              <span>Strava is a leaderboard. Optimised for competition, not consistency.</span>
            </li>
            <li className="flex gap-4">
              <span className="text-text-disabled select-none">—</span>
              <span>Whoop is a recovery score. Optimised for athletes, not lives.</span>
            </li>
            <li className="flex gap-4">
              <span className="text-text-disabled select-none">—</span>
              <span>Apple Fitness+ is a video catalogue. No memory, no plan.</span>
            </li>
            <li className="flex gap-4">
              <span className="text-text-disabled select-none">—</span>
              <span>Noom is calorie psychology. Useful, but not training.</span>
            </li>
            <li className="flex gap-4">
              <span className="text-text-disabled select-none">—</span>
              <span>None of them know it&apos;s the second day of your cycle, or that your reformer instructor is sick this week, or that you had Botox yesterday.</span>
            </li>
          </ul>
          <p className="text-body-lg text-text-primary leading-relaxed pt-4 italic font-serif">
            The market has solved &ldquo;more.&rdquo; It hasn&apos;t solved
            &ldquo;you.&rdquo;
          </p>
        </div>
      </section>

      {/* ── Slide 5 · Why you (personalized) ────────────────────────── */}
      <section className="deck-slide">
        <div className="deck-slide-content space-y-8">
          <p className="text-label tracking-widest uppercase font-sans font-medium" style={{ color: "#D4C4A8" }}>
            Why I&apos;m reaching out to you
          </p>
          <h2 className="font-serif text-display-md font-light leading-tight">
            I&apos;ve been reading your work since <Token>{"{YEAR}"}</Token>.
          </h2>
          <div className="space-y-5 text-body-lg text-text-secondary leading-relaxed">
            <p>
              Dear <Token>{"{NAME}"}</Token>,
            </p>
            <p>
              <Token>{"{THEIR_BOOK_OR_RESEARCH}"}</Token> shaped how I
              think about training my own body. The piece I keep returning
              to is the way you talk about women as physiologically
              specific — not as smaller men, not as a special case, but as
              the default user of any serious system.
            </p>
            <p>
              Vita is built on that premise. The product is shipping. The
              voice is in place. What it&apos;s missing is your eye on the
              clinical edges: the cycle-aware programming, the line between
              observation and advice. I&apos;d like to ask whether you&apos;d be willing
              to read the next twelve weeks of work in progress and tell
              me what I&apos;m getting wrong.
            </p>
          </div>
        </div>
      </section>

      {/* ── Slide 6 · The ask ───────────────────────────────────────── */}
      <section className="deck-slide">
        <div className="deck-slide-content">
          <div className="grid md:grid-cols-2 gap-12">
            <div className="space-y-6">
              <p className="text-label tracking-widest uppercase font-sans font-medium" style={{ color: "#D4C4A8" }}>
                What I&apos;d ask of you
              </p>
              <ul className="space-y-4 text-body-lg text-text-secondary leading-relaxed">
                <li className="flex gap-4">
                  <span className="text-text-disabled select-none">—</span>
                  <span>One 30-minute call to walk through Vita as it is.</span>
                </li>
                <li className="flex gap-4">
                  <span className="text-text-disabled select-none">—</span>
                  <span>Permission to send you a build link and ask occasional questions over email — not weekly, not a workload.</span>
                </li>
                <li className="flex gap-4">
                  <span className="text-text-disabled select-none">—</span>
                  <span>Your honest read on where the clinical voice rings false, and where it&apos;s landing.</span>
                </li>
                <li className="flex gap-4">
                  <span className="text-text-disabled select-none">—</span>
                  <span>Optional: a public note of advisorship once you&apos;re comfortable, for the record.</span>
                </li>
              </ul>
            </div>
            <div className="space-y-6">
              <p className="text-label tracking-widest uppercase font-sans font-medium" style={{ color: "#D4C4A8" }}>
                In exchange
              </p>
              <ul className="space-y-4 text-body-lg text-text-secondary leading-relaxed">
                <li className="flex gap-4">
                  <span className="text-text-disabled select-none">—</span>
                  <span>Advisor equity at the standard early-stage band — discussed once we know each other better.</span>
                </li>
                <li className="flex gap-4">
                  <span className="text-text-disabled select-none">—</span>
                  <span>Lifetime access to Vita for you and anyone you name.</span>
                </li>
                <li className="flex gap-4">
                  <span className="text-text-disabled select-none">—</span>
                  <span>A real seat at the table on the female-physiology side of the product, before it&apos;s legible to anyone else.</span>
                </li>
                <li className="flex gap-4">
                  <span className="text-text-disabled select-none">—</span>
                  <span>Quiet credit. I sign emails. I don&apos;t use names without permission.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── Slide 7 · Honest state ──────────────────────────────────── */}
      <section className="deck-slide">
        <div className="deck-slide-content">
          <div className="grid md:grid-cols-2 gap-12">
            <div className="space-y-6">
              <p className="text-label tracking-widest uppercase font-sans font-medium" style={{ color: "#D4C4A8" }}>
                Where Vita is today
              </p>
              <ul className="space-y-4 text-body-lg text-text-secondary leading-relaxed">
                <li className="flex gap-4">
                  <span className="text-text-disabled select-none">—</span>
                  <span>Live web app and PWA. iOS-installable. Daily ritual works end-to-end.</span>
                </li>
                <li className="flex gap-4">
                  <span className="text-text-disabled select-none">—</span>
                  <span>Apple Health integration shipping; Oura/Whoop/Garmin in the next quarter.</span>
                </li>
                <li className="flex gap-4">
                  <span className="text-text-disabled select-none">—</span>
                  <span>Goal decomposition, calendar planning, wearable-driven habit resolution, push nudges, weekly review email.</span>
                </li>
                <li className="flex gap-4">
                  <span className="text-text-disabled select-none">—</span>
                  <span>Solo founder. Onboarding the first 50 paying users this quarter.</span>
                </li>
              </ul>
            </div>
            <div className="space-y-6">
              <p className="text-label tracking-widest uppercase font-sans font-medium" style={{ color: "#D4C4A8" }}>
                What I&apos;m not yet
              </p>
              <ul className="space-y-4 text-body-lg text-text-secondary leading-relaxed">
                <li className="flex gap-4">
                  <span className="text-text-disabled select-none">—</span>
                  <span>Clinically validated. The voice draws on published work; it does not yet have a clinician&apos;s read on the edges.</span>
                </li>
                <li className="flex gap-4">
                  <span className="text-text-disabled select-none">—</span>
                  <span>Cycle-phase-aware. The model exists; the programming logic needs your read before I ship it.</span>
                </li>
                <li className="flex gap-4">
                  <span className="text-text-disabled select-none">—</span>
                  <span>Backed. Bootstrapped to date. Seed conversations begin once advisor signal is in place.</span>
                </li>
                <li className="flex gap-4">
                  <span className="text-text-disabled select-none">—</span>
                  <span>Done. Vita will keep being a draft for years. That&apos;s the design.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── Slide 8 · The ask close ─────────────────────────────────── */}
      <section className="deck-slide">
        <div className="deck-slide-content text-center space-y-10">
          <h2 className="font-serif text-display-xl font-light leading-tight">
            A 30-minute conversation.
          </h2>
          <p className="text-body-lg text-text-secondary leading-relaxed max-w-[560px] mx-auto">
            That&apos;s the entire ask. Bring no homework, no slide deck
            of your own. I&apos;ll walk you through the product live,
            answer anything, and listen carefully to what you push back on.
          </p>
          <p className="font-serif italic text-display-sm font-light pt-8">
            — Juliana
          </p>
          <p className="text-caption tracking-widest uppercase text-text-disabled pt-12">
            juliana.kolarski@gmail.com · Toronto · vita.app
          </p>
        </div>
      </section>
    </main>
  );
}
