import "../deck.css";
import { requireDeckAccess, DeckToolbar, Token } from "../lib";

/**
 * Investor deck — seed-stage. 12 slides. Same voice as the advisor
 * deck but with chart treatments on market and traction. Send only
 * when an investor explicitly asks; otherwise stay in your back
 * pocket and lead with a one-paragraph email.
 */

export const dynamic = "force-dynamic";
export const metadata = { title: "Vita — investor deck", robots: "noindex" };

export default async function InvestorDeckPage() {
  await requireDeckAccess();

  return (
    <main>
      <DeckToolbar tokensRemaining />

      {/* ── 1 · Cover ───────────────────────────────────────────────── */}
      <section className="deck-slide">
        <div className="deck-slide-content text-center space-y-10">
          <p className="font-serif text-display-2xl font-light tracking-[0.18em]">VITA</p>
          <p className="font-serif text-display-sm font-light text-text-secondary leading-snug max-w-[640px] mx-auto">
            Building the female longevity company.
          </p>
          <div className="pt-24">
            <p className="text-caption tracking-widest uppercase text-text-disabled text-left">
              Seed memo · Juliana, founder · Toronto · 2026
            </p>
          </div>
        </div>
      </section>

      {/* ── 2 · Problem ─────────────────────────────────────────────── */}
      <section className="deck-slide">
        <div className="deck-slide-content space-y-10">
          <p className="text-label tracking-widest uppercase font-sans font-medium" style={{ color: "#D4C4A8" }}>
            Problem
          </p>
          <p className="font-serif text-display-sm font-light leading-snug text-text-primary">
            Women aged 25–45 with sophisticated body and lifestyle goals
            spend hundreds of dollars a month on wearables, classes,
            supplements, and cosmetic treatments — and use software
            built by men, for men, that has no memory, no plan, and no
            sense of how a woman&apos;s body actually changes month to
            month.
          </p>
          <p className="font-serif text-display-md font-light leading-tight pt-6 text-text-primary">
            They&apos;re training alone, with a notebook.
          </p>
        </div>
      </section>

      {/* ── 3 · What we built ───────────────────────────────────────── */}
      <section className="deck-slide">
        <div className="deck-slide-content space-y-10">
          <p className="text-label tracking-widest uppercase font-sans font-medium" style={{ color: "#D4C4A8" }}>
            What we built
          </p>
          <h2 className="font-serif text-display-md font-light leading-tight">
            Three primitives. One voice.
          </h2>
          <div className="grid md:grid-cols-3 gap-8 pt-4">
            <Primitive
              num="01"
              title="Memory"
              body="Persistent, queryable memory across goals, treatments, conversations, and physiology. Vita knows what you said three weeks ago and why Tuesday is hard."
            />
            <Primitive
              num="02"
              title="Plan"
              body="A calendar that respects how women actually live — cycle phases, treatments, sleep, travel. Habits and workouts auto-adjust around constraints, not over them."
            />
            <Primitive
              num="03"
              title="Trust"
              body="Multi-source wearable integration with source priority and honest gap-framing. The number on the tile is the number — no smoothed-out lies."
            />
          </div>
        </div>
      </section>

      {/* ── 4 · Why now ─────────────────────────────────────────────── */}
      <section className="deck-slide">
        <div className="deck-slide-content space-y-10">
          <p className="text-label tracking-widest uppercase font-sans font-medium" style={{ color: "#D4C4A8" }}>
            Why now
          </p>
          <h2 className="font-serif text-display-md font-light leading-tight">
            Three forces meeting in the same window.
          </h2>
          <div className="space-y-5">
            <NumberCard
              num="01"
              title="LLMs got cheap and personal."
              body="A coach who remembers you costs cents per day to run. The unit economics that broke 10× consumer-AI startups in 2023 work today."
            />
            <NumberCard
              num="02"
              title="Wearable density crossed the line."
              body="Apple Watch + Oura + Whoop adoption among the target demographic exceeds 60% in major North American metros. The data exists; the interpretation layer doesn&apos;t."
            />
            <NumberCard
              num="03"
              title="Women's longevity finally has language."
              body="Stacy Sims, Mary Claire Haver, Sara Gottfried, Rhonda Patrick — the public discourse is now specific to female physiology. Vita is the consumer surface for it."
            />
          </div>
        </div>
      </section>

      {/* ── 5 · Customer ────────────────────────────────────────────── */}
      <section className="deck-slide">
        <div className="deck-slide-content space-y-10">
          <p className="text-label tracking-widest uppercase font-sans font-medium" style={{ color: "#D4C4A8" }}>
            Customer
          </p>
          <h2 className="font-serif text-display-md font-light leading-tight">
            Sarah, 34.
          </h2>
          <div className="space-y-5 text-body-lg text-text-secondary leading-relaxed">
            <p>
              Lawyer in Toronto. Engaged. Reformer Pilates three times a
              week, hot yoga on Sundays, walks 12,000 steps a day on
              purpose. Apple Watch on the left wrist, Oura ring on the
              right. Spends roughly $480/month on classes, $90/month on
              supplements, $200/month on treatments. Reads
              <Token>{" {PRIOR WORK} "}</Token>
              and listens to two health podcasts on commute.
            </p>
            <p>
              She wants to be lean and strong for her wedding in eight
              months. She wants her perimenopause symptoms understood
              before they arrive. She wants a coach who knows that the
              week of the treatment is not the week to push.
            </p>
            <p>
              She has been training herself with a notebook for nine years.
              She has tried six apps. None of them remembered her past
              the first onboarding.
            </p>
          </div>
          <p className="text-caption text-text-secondary pt-4 italic font-serif">
            Sarah is composite — drawn from interviews with 14 early users.
          </p>
        </div>
      </section>

      {/* ── 6 · Market ──────────────────────────────────────────────── */}
      <section className="deck-slide">
        <div className="deck-slide-content space-y-10">
          <p className="text-label tracking-widest uppercase font-sans font-medium" style={{ color: "#D4C4A8" }}>
            Market
          </p>
          <h2 className="font-serif text-display-md font-light leading-tight">
            $42B addressable. $4B serviceable. $400M to reach in five years.
          </h2>
          <div className="space-y-6 pt-4">
            <MarketRow
              tag="TAM"
              num="$42B"
              body="Global women&apos;s digital health, fitness software, and wellness coaching, 2025."
            />
            <MarketRow
              tag="SAM"
              num="$4.2B"
              body="English-speaking women 25–45 with disposable income and an existing wearable. Sources: Statista, Rock Health 2025."
            />
            <MarketRow
              tag="SOM"
              num="$420M"
              body="1% of SAM at the $14.99/month tier — a believable five-year ceiling without category-killing distribution."
            />
          </div>
          <div className="border-t border-border-subtle pt-8 mt-4">
            <p className="text-label tracking-widest uppercase font-sans font-medium text-text-disabled mb-4">
              Comparable acquisitions
            </p>
            <div className="space-y-2 text-body text-text-secondary">
              <p>MyFitnessPal — $345M (2015), $810M (2020)</p>
              <p>Whoop — $3.6B last private valuation (2021)</p>
              <p>Calm — $2.0B (2020)</p>
              <p>Noom — $3.7B last private valuation (2021)</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 7 · Why we win ──────────────────────────────────────────── */}
      <section className="deck-slide">
        <div className="deck-slide-content space-y-10">
          <p className="text-label tracking-widest uppercase font-sans font-medium" style={{ color: "#D4C4A8" }}>
            Why we win
          </p>
          <h2 className="font-serif text-display-md font-light leading-tight">
            Four moats. Each one widens with use.
          </h2>
          <div className="space-y-4 pt-2">
            <MoatCard
              num="01"
              tier={1}
              title="Memory."
              body="Every conversation makes Vita more specific to the user. Switching cost compounds quietly."
            />
            <MoatCard
              num="02"
              tier={2}
              title="Voice."
              body="Vita is a person. Restrained, warm, direct, no emoji. Competitors can copy the features; the voice takes years."
            />
            <MoatCard
              num="03"
              tier={3}
              title="Wearable trust."
              body="Multi-source ingestion, source priority, honest gap-framing. The data layer is the most expensive part of the system to copy."
            />
            <MoatCard
              num="04"
              tier={4}
              title="Female-physiology default."
              body="The product is built around women, not adapted to them. Everything from cycle awareness to treatment-week language is in the architecture."
            />
          </div>
        </div>
      </section>

      {/* ── 8 · Traction ────────────────────────────────────────────── */}
      <section className="deck-slide">
        <div className="deck-slide-content space-y-10">
          <p className="text-label tracking-widest uppercase font-sans font-medium" style={{ color: "#D4C4A8" }}>
            Traction
          </p>
          <h2 className="font-serif text-display-md font-light leading-tight">
            Six months from idea to live product. Solo.
          </h2>
          <div className="grid md:grid-cols-2 gap-8 pt-4">
            <Metric label="Built" num={<Token>{"[FEATURE COUNT]"}</Token>} caption="Daily ritual + planner + memory + wearable + push + email pipeline + admin." />
            <Metric label="Live users" num={<Token>{"[METRIC]"}</Token>} caption="Onboarding the first paying cohort this quarter." />
            <Metric label="Day-30 retention (early signal)" num={<Token>{"[METRIC]"}</Token>} caption="Target &gt; 30%, stretch &gt; 45%." />
            <Metric label="Wearable connect rate" num={<Token>{"[METRIC]"}</Token>} caption="Apple Health connection completed in onboarding." />
            <Metric label="Conversation depth" num={<Token>{"[METRIC]"}</Token>} caption="Avg messages per active user per week." />
            <Metric label="Inbound advisor interest" num={<Token>{"[METRIC]"}</Token>} caption="Without paid acquisition. Word of mouth only." />
          </div>
        </div>
      </section>

      {/* ── 9 · Business model ──────────────────────────────────────── */}
      <section className="deck-slide">
        <div className="deck-slide-content space-y-10">
          <p className="text-label tracking-widest uppercase font-sans font-medium" style={{ color: "#D4C4A8" }}>
            Business model
          </p>
          <h2 className="font-serif text-display-md font-light leading-tight">
            One plan. Annual or monthly. No free tier.
          </h2>
          <div className="grid md:grid-cols-3 gap-6 pt-4">
            <PriceCard label="Monthly" price="$14.99" sub="per month, billed monthly" />
            <PriceCard label="Annual" price="$119" sub="per year ≈ $9.92/mo · save 34%" emphasis />
            <PriceCard label="Lifetime" price="$499" sub="founders only · first 100 users" />
          </div>
          <div className="border-t border-border-subtle pt-8 mt-4 space-y-3 text-body text-text-secondary leading-relaxed">
            <p>
              <span className="text-text-primary">Unit economics</span> at $14.99/mo:
            </p>
            <p className="text-body-sm">
              · LLM cost per active user / month: ~$2.40 at current Haiku
              + Sonnet mix
              · Email + push + Postgres + hosting: ~$0.80
              · Gross margin per active user: ~78%
              · Payback period at expected CAC: <Token>{"[METRIC]"}</Token>
            </p>
          </div>
        </div>
      </section>

      {/* ── 10 · Roadmap ────────────────────────────────────────────── */}
      <section className="deck-slide">
        <div className="deck-slide-content space-y-10">
          <p className="text-label tracking-widest uppercase font-sans font-medium" style={{ color: "#D4C4A8" }}>
            Roadmap
          </p>
          <h2 className="font-serif text-display-md font-light leading-tight">
            Twelve months. Four quarters. One company.
          </h2>
          <div className="grid md:grid-cols-4 gap-6 pt-4">
            <Quarter
              label="Q1"
              title="Live · ship the dashboard"
              body="First 50 paying users. Apple Health pipeline production-grade. Advisor signal in place."
            />
            <Quarter
              label="Q2"
              title="Cycle + treatment-aware"
              body="Phase-aware programming. Treatment-week guardrails. Garmin / Oura / Whoop wearables."
            />
            <Quarter
              label="Q3"
              title="Native iOS"
              body="App Store launch. PWA stays. Push notifications on iOS. Apple Watch complications."
            />
            <Quarter
              label="Q4"
              title="Series A readiness"
              body="10,000 paying users. Day-30 retention &gt; 35%. Two clinical advisor case studies."
            />
          </div>
        </div>
      </section>

      {/* ── 11 · Founder ────────────────────────────────────────────── */}
      <section className="deck-slide">
        <div className="deck-slide-content space-y-10">
          <p className="text-label tracking-widest uppercase font-sans font-medium" style={{ color: "#D4C4A8" }}>
            Founder
          </p>
          <div className="flex items-start gap-8">
            {/* Photo placeholder — replace with real headshot */}
            <div
              className="w-28 h-28 rounded-full shrink-0 flex items-center justify-center font-serif text-display-md font-light"
              style={{ background: "#1F2530", color: "#D4C4A8", border: "1px solid #2A3142" }}
            >
              J
            </div>
            <div className="space-y-5">
              <h2 className="font-serif text-display-md font-light leading-tight">
                Juliana Kolarski.
              </h2>
              <p className="text-body-lg text-text-secondary leading-relaxed">
                <Token>{"[PRIOR WORK / ROLES — fill in: companies, what you built, what you led]"}</Token>.
                Built Vita solo over the last six months while continuing
                to run her existing practice in Toronto. The user, the
                operator, the founder, and the only writer of the voice.
              </p>
              <p className="text-body-lg text-text-secondary leading-relaxed">
                Hiring begins post-seed. The first hires are designed to
                outlast the founder, not orbit her: a clinical advisor
                MD, a senior wearable / data engineer, and a creative
                director who can extend Vita&apos;s voice across email,
                product copy, and brand.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 12 · The ask ────────────────────────────────────────────── */}
      <section className="deck-slide">
        <div className="deck-slide-content text-center space-y-10">
          <p className="text-label tracking-widest uppercase font-sans font-medium" style={{ color: "#D4C4A8" }}>
            The ask
          </p>
          <h2 className="font-serif text-display-2xl font-light leading-tight">
            $1.5M seed.
          </h2>
          <p className="text-body-lg text-text-secondary leading-relaxed max-w-[560px] mx-auto">
            18 months of runway. Build the team that ships native iOS,
            Garmin/Oura/Whoop, and cycle-aware programming. Reach the
            10,000-user, &gt; 35% Day-30 mark that opens the Series A
            conversation honestly.
          </p>
          <div className="grid md:grid-cols-3 gap-6 pt-6 max-w-[640px] mx-auto text-left">
            <UseOfFunds label="Team" pct="55%" body="Three hires: clinical advisor MD, wearable/data engineer, creative director." />
            <UseOfFunds label="Product" pct="25%" body="Native iOS, additional wearables, cycle-aware programming." />
            <UseOfFunds label="Runway" pct="20%" body="Compute, infrastructure, legal, founder salary at survival level." />
          </div>
          <p className="text-caption tracking-widest uppercase text-text-disabled pt-12">
            juliana.kolarski@gmail.com · Toronto · vita.app
          </p>
        </div>
      </section>
    </main>
  );
}

// ── Slide-specific components ─────────────────────────────────────────────

function Primitive({ num, title, body }: { num: string; title: string; body: string }) {
  return (
    <div className="space-y-3">
      <p className="text-caption tracking-widest uppercase font-sans font-medium" style={{ color: "#D4C4A8" }}>
        {num}
      </p>
      <p className="font-serif text-heading-lg font-light text-text-primary leading-snug">
        {title}
      </p>
      <p className="text-body text-text-secondary leading-relaxed">{body}</p>
    </div>
  );
}

function NumberCard({ num, title, body }: { num: string; title: string; body: string }) {
  return (
    <div
      className="border rounded-md p-6 space-y-2"
      style={{ borderColor: "#2A3142", background: "rgba(31,37,48,0.3)" }}
    >
      <div className="flex items-baseline gap-4">
        <p className="text-caption tracking-widest font-sans font-medium" style={{ color: "#D4C4A8" }}>
          {num}
        </p>
        <p className="font-serif text-heading-md font-light text-text-primary">{title}</p>
      </div>
      <p className="text-body text-text-secondary leading-relaxed pl-12">{body}</p>
    </div>
  );
}

function MarketRow({ tag, num, body }: { tag: string; num: string; body: string }) {
  return (
    <div className="grid grid-cols-[80px_180px_1fr] gap-6 items-baseline border-b border-border-subtle pb-5">
      <p className="text-label tracking-widest uppercase font-sans font-medium" style={{ color: "#D4C4A8" }}>
        {tag}
      </p>
      <p className="font-serif text-display-md font-light tabular-nums">{num}</p>
      <p className="text-body text-text-secondary leading-relaxed">{body}</p>
    </div>
  );
}

function MoatCard({ num, tier, title, body }: { num: string; tier: 1 | 2 | 3 | 4; title: string; body: string }) {
  // Each subsequent moat reads slightly more prominent — depth visual
  const padding = ["p-4", "p-5", "p-6", "p-7"][tier - 1];
  const opacity = [0.4, 0.55, 0.7, 0.9][tier - 1];
  return (
    <div
      className={`border rounded-md ${padding}`}
      style={{ borderColor: "#2A3142", background: `rgba(31,37,48,${opacity * 0.4})` }}
    >
      <div className="flex items-baseline gap-4">
        <p className="text-caption tracking-widest font-sans font-medium" style={{ color: "#D4C4A8", opacity }}>
          {num}
        </p>
        <p className="font-serif text-heading-md font-light text-text-primary">{title}</p>
      </div>
      <p className="text-body text-text-secondary leading-relaxed pl-12 mt-1">{body}</p>
    </div>
  );
}

function Metric({ label, num, caption }: { label: string; num: React.ReactNode; caption: string }) {
  return (
    <div className="space-y-2">
      <p className="text-label tracking-widest uppercase font-sans font-medium text-text-disabled">
        {label}
      </p>
      <p className="font-serif text-display-md font-light tabular-nums">{num}</p>
      <p className="text-caption text-text-muted leading-relaxed">{caption}</p>
    </div>
  );
}

function PriceCard({ label, price, sub, emphasis }: { label: string; price: string; sub: string; emphasis?: boolean }) {
  return (
    <div
      className="border rounded-md p-6 space-y-3"
      style={{
        borderColor: emphasis ? "#D4C4A8" : "#2A3142",
        background: emphasis ? "rgba(212,196,168,0.06)" : "rgba(31,37,48,0.3)",
      }}
    >
      <p className="text-label tracking-widest uppercase font-sans font-medium" style={{ color: emphasis ? "#D4C4A8" : "#A8A29A" }}>
        {label}
      </p>
      <p className="font-serif text-display-md font-light tabular-nums">{price}</p>
      <p className="text-caption text-text-secondary leading-relaxed">{sub}</p>
    </div>
  );
}

function Quarter({ label, title, body }: { label: string; title: string; body: string }) {
  return (
    <div className="space-y-2">
      <p className="text-label tracking-widest uppercase font-sans font-medium" style={{ color: "#D4C4A8" }}>
        {label}
      </p>
      <p className="font-serif text-heading-md font-light text-text-primary leading-snug">{title}</p>
      <p className="text-caption text-text-secondary leading-relaxed">{body}</p>
    </div>
  );
}

function UseOfFunds({ label, pct, body }: { label: string; pct: string; body: string }) {
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <p className="text-label tracking-widest uppercase font-sans font-medium" style={{ color: "#D4C4A8" }}>
          {label}
        </p>
        <p className="font-serif text-heading-md font-light tabular-nums">{pct}</p>
      </div>
      <p className="text-caption text-text-secondary leading-relaxed">{body}</p>
    </div>
  );
}
