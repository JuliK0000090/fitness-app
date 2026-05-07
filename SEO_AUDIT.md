# Vita — SEO Audit & Action Plan

Audit conducted from the codebase only — no Search Console, no live
crawl, no Lighthouse. This is the technical state on disk plus the
keyword/content picture inferred from the [competitive
brief](#) and the
target user from [brand/VITA-BRAND.md](brand/VITA-BRAND.md).

Read with [CAMPAIGN_90D.md](CAMPAIGN_90D.md) — many strategic SEO moves
are already on that calendar (founder essays, content pillars).

---

## Executive summary

Vita has a strong content brain (brand/VITA-BRAND.md, 44 emails, two decks, a
target user with documented vocabulary) and a weak SEO foundation. The
single biggest issue is **the site has no custom domain** — it's
served at `fitness-app-production-2ef2.up.railway.app`, which can't
build authority and won't ever rank. Fix that first; everything else
is downstream.

After domain, in priority order: a `robots.ts` and `sitemap.ts`,
de-duplicating two privacy pages, `noindex` on gated/draft pages, a
real OG share card, and one structured pillar content series Sarah
actually searches for ("wearable interpretation in plain English for
women," "cycle-aware training").

The brand cannot rank for what nobody searches yet ("AI trainer who
compounds"). It can rank for what Sarah Googles around the product —
that's the SEO play, not brand-keyword chasing.

---

## Technical SEO findings

Severity legend: **P0** = ship this week, **P1** = ship this month,
**P2** = ship this quarter.

### P0 — Foundation (none of this exists yet)

1. **No custom domain.** [next.config.ts](next.config.ts) and
   [app/layout.tsx:25-26](app/layout.tsx#L25-L26) fall back to
   `fitness-app-production-2ef2.up.railway.app`. Railway-hosted
   subdomains can't accumulate domain authority, will be dropped by
   most aggregators, look unprofessional in shares, and break trust on
   first impression. **This is the highest-leverage SEO fix.**

2. **No `robots.ts`.** Search engines will crawl everything:
   `/admin/users`, `/admin/integrity`, `/dev/calendar-test`,
   `/dev/calendar-verify`, `/welcome`, `/onboarding`, `/mockups`,
   `/decks/advisor`, `/decks/investor`. The decks are gated by admin
   email but the URLs are still indexable. Need an
   [app/robots.ts](app/robots.ts) blocking these.

3. **No `sitemap.ts`.** Crawlers have nothing to follow into. Need
   [app/sitemap.ts](app/sitemap.ts) listing the four public URLs (`/`,
   `/auth/login`, `/auth/register`, `/legal/privacy`, `/legal/terms`).

4. **Duplicate privacy pages.** Both [app/privacy/page.tsx](app/privacy/page.tsx)
   and [app/legal/privacy/page.tsx](app/legal/privacy/page.tsx) exist
   with different copy. The footer links to `/legal/privacy` but
   `/privacy` is also live. **Pick one, 301 the other**, or you split
   ranking signal between two URLs forever.

5. **No `noindex` on gated/draft surfaces.** Add per-page
   `metadata.robots = { index: false }` to: `/welcome`, `/onboarding`,
   `/mockups`, `/decks/advisor`, `/decks/investor`, `/dev/*`,
   `/admin/*`. The robots.ts blocks the crawl path; `noindex` belt-and-
   braces it for any direct link.

### P1 — Quality (exists, suboptimal)

6. **OG image is the logo SVG, not a designed share card.** Layout
   serves `/icons/icon-512.svg` as the OG image
   ([app/layout.tsx:46](app/layout.tsx#L46)). WhatsApp, iMessage,
   Twitter, LinkedIn previews show a tiny logo on a square card. Need
   a 1200×630 designed image with the wordmark + tagline. Same for the
   Twitter card — currently `summary` (small), should be
   `summary_large_image` once a banner exists.

7. **Meta description doesn't match the landing.** The site
   description in [app/layout.tsx:23](app/layout.tsx#L23) is
   "Vita is your AI personal trainer for fitness, lifestyle, and
   longevity goals…" but the H1 on [app/page.tsx](app/page.tsx) reads
   "Your body is already talking. Vita is the one that listens." Two
   different brand sentences in the same crawl. Pick one (per
   brand/VITA-BRAND.md, the first-person rewrite is the right one) and align.

8. **Title tag earns zero search keywords.** "Vita — A private trainer
   who remembers you" is brand-true but no one searches for it. Tail
   it: `Vita — Private AI trainer for women | Memory · Plan · Wearables`.
   Brand-true and keyword-bearing.

9. **No JSON-LD structured data.** Add `SoftwareApplication` schema
   on the landing (rich result eligibility), `Organization` schema on
   the root, `FAQPage` schema on a future FAQ. Free, fast, eligible
   for rich results.

10. **No canonical URLs declared.** Per-page `metadata.alternates =
    { canonical: ... }` should be set on the landing and legal pages.
    Without it, a Railway-hosted URL competes with any future custom
    domain post-migration.

11. **Privacy page H1 styling drifts from brand.** [app/legal/privacy/page.tsx:4](app/legal/privacy/page.tsx#L4)
    uses `text-2xl font-bold` instead of the serif token system. Not
    SEO per se, but search-result snippets pull from the visible H1 —
    a weakly-styled page reads as a placeholder, which it currently is.

### P2 — Compounding (longer horizon)

12. **No blog / journal / content surface.** Vita has no `/journal`,
    `/notes`, or `/blog` route. The 90-day plan calls for founder
    essays and pillar content. Without a content surface those live
    on Substack, which builds Substack's domain authority, not Vita's.

13. **No Search Console / Bing Webmaster integration.** Once a custom
    domain is live, both should be set up day one and reviewed monthly.

14. **No internal linking strategy.** The landing has no links into
    deeper content (because there isn't deeper content). Once journal
    posts exist, the landing should link into 3–5 pillar pieces.

15. **No image SEO.** No alt text on the few decorative SVGs. Once
    real product screenshots and OG images exist, alt text matters.

16. **Core Web Vitals not measured in CI.** The product feels fast but
    nothing audits this on every deploy. Lighthouse CI integration is
    a one-evening task, then forever-watched.

---

## Keyword opportunities

Sarah doesn't search for "AI trainer who compounds." She Googles
specific questions around her body, her week, and her wearable. SEO
lives in the long tail — informational queries Sarah types when she's
already curious about the product space.

### Tier 1 — Informational (high volume, low intent, good for top-of-funnel)

These are educational queries with consistent monthly volume. Vita can
publish authoritative pieces on each, ranking via the "wearable
interpretation in plain English for women" angle.

- "what is HRV"
- "how to train during luteal phase"
- "muscle protection on GLP-1"
- "training around bad sleep"
- "Oura readiness score explained"
- "how to lift heavier safely after 35"
- "back squat progression for women"
- "scale up but body fat down — why"
- "is fasted cardio good for women"

### Tier 2 — Commercial-investigation (medium volume, higher intent)

These are queries from people about to buy *something*. Vita ranking
here is harder but more valuable.

- "AI personal trainer app"
- "AI fitness app for women"
- "best fitness app with Apple Health"
- "Oura compatible workout app"
- "personalized workout plan app"
- "workout app that adapts to sleep"
- "menstrual cycle workout app"
- "wedding workout plan app"

### Tier 3 — Comparison (low volume, highest intent)

Once Vita has search visibility, comparison queries become valuable.
Don't write these in week one — write them in month four when at
least one user has typed "Vita vs Future" into Google. (Search Console
will tell you.)

- "Vita vs Future"
- "Vita vs Noom"
- "Vita vs Whoop coach"
- "Vita vs Apple Fitness+"
- "alternatives to Peloton app"
- "alternatives to MyFitnessPal"

### Tier 4 — Brand (must rank #1, day one)

- "Vita app"
- "Vita AI trainer"
- "Vita Toronto"
- "Vita Juliana"

Brand searches are zero-volume today. After founder PR and the first
podcast, they spike. Vita must rank #1 for them or all earned media
leaks to a wrong-brand homonym (there are several "Vita" health/wellness
sites — competition for the brand term is real).

---

## Content gaps competitors own (and how to flank)

| Competitor | What they own (SEO-wise) | Why it doesn't threaten Vita | What Vita writes instead |
|---|---|---|---|
| **Strava** | Run-tracking how-tos, segment guides, "what is Strava" | Activity-tracking, not training. Vita's not in this lane. | Skip. Don't write running content. |
| **Peloton** | Class guides, instructor names, "best Peloton classes" | Hardware-anchored, instructor-anchored. Vita has neither. | Skip. Different product category. |
| **MyFitnessPal** | "Calories in X", macro calculators, "how to track macros" | Pure utility content. Vita doesn't track calories. | Skip — but write "why I don't ask you to count calories" as a positioning piece. |
| **Noom** | "Is Noom worth it", diet psychology, weight-loss recipes | Diet-anchored. Vita is training-anchored. | Write "muscle protection on GLP-1" — the medical bridge Noom doesn't fully serve. |
| **Whoop** | "What is HRV", "recovery score meaning", "how to improve sleep" | Athlete-coded. Their content uses athlete language and assumes athlete context. | **The biggest gap.** Write Whoop's content in Sarah's language. Same questions, different reader. |
| **Apple Fitness+** | Generic Apple-domain content; weak owned vertical | Relies on apple.com gravity. Doesn't really own SEO. | Vita can outrank Apple Fitness+ on most non-brand fitness queries — Apple under-invests in SEO content. |
| **Future / Caliber** | App Store ASO, podcast features, "best 1-on-1 trainer apps" | Light SEO content footprint. | Vita can compete on "AI vs human trainer" content as the bridge. |

**The biggest open lane:** wearable interpretation in plain language,
written for women. Whoop owns it for male athletes. Nobody owns
it for Sarah.

**The second open lane:** cycle-aware training. Hers and Maven touch
the medical edge; Stacy Sims, Mary Claire Haver, Sara Gottfried touch
the research edge. Nobody is shipping practical, actionable, "here's
your week around the luteal phase" content at scale. Vita can.

---

## Action plan

### Quick wins — ship this week (under 4 hours total)

- [ ] **1. Add [app/robots.ts](app/robots.ts).** Block `/admin/*`,
      `/dev/*`, `/welcome`, `/onboarding`, `/mockups`, `/decks/*`,
      `/api/*`, `/partner/*`. Allow everything else.
- [ ] **2. Add [app/sitemap.ts](app/sitemap.ts).** List `/`,
      `/auth/login`, `/auth/register`, `/legal/privacy`,
      `/legal/terms`. Generate `lastModified` from build time.
- [ ] **3. De-duplicate privacy.** Decide canonical: `/legal/privacy`
      (since the footer already links there). Either delete
      [app/privacy/page.tsx](app/privacy/page.tsx) or convert it to a
      `redirect("/legal/privacy")`. Pick the latter to preserve any
      external link.
- [ ] **4. Add `noindex` to gated/draft pages.** Per-page
      `export const metadata = { robots: { index: false } }` on
      `/welcome`, `/onboarding`, `/mockups`, `/decks/advisor`,
      `/decks/investor`. Already noindex-by-redirect for `/dev` and
      `/admin` if those redirect for non-admins, but add explicitly.
- [ ] **5. Tune the title tag and meta description.** Update
      `SHARE_TITLE` and `SHARE_DESCRIPTION` in
      [app/layout.tsx:21-23](app/layout.tsx#L21-L23) to align with
      the brand/VITA-BRAND.md sample landing hero and add one keyword phrase
      ("AI personal trainer for women" or similar). Title under
      60 chars, description under 155.
- [ ] **6. Add a designed OG share card.** 1200×630 PNG, wordmark +
      tagline + champagne accent. Replace
      [app/layout.tsx:46](app/layout.tsx#L46). Switch Twitter card to
      `summary_large_image` ([app/layout.tsx:49](app/layout.tsx#L49)).
- [ ] **7. Add canonical URL declarations** on every public page via
      `metadata.alternates.canonical`.

### Strategic investments — over 90 days

#### Phase 1 (weeks 1–4): foundation

- [ ] **8. Custom domain.** Buy `vita.app`, `meetvita.com`, or
      similar. Wire to Railway. Add 301s from the Railway URL. Update
      `NEXT_PUBLIC_SITE_URL`. **This is the single highest-leverage
      SEO action.** Without it, nothing else compounds.
- [ ] **9. Search Console + Bing Webmaster.** Verify the new domain
      day one. Submit the sitemap. Set up email alerts.
- [ ] **10. Content surface.** Add `/journal` route with one MDX or
      database-backed pillar piece live. Founder essay #1 from
      CAMPAIGN_90D.md belongs here, not on Substack alone.
- [ ] **11. JSON-LD structured data.** `SoftwareApplication` on `/`,
      `Organization` in the layout. ~30 lines of code. Free rich-result
      eligibility.

#### Phase 2 (weeks 5–8): pillar content

- [ ] **12. Five pillar pieces** on the wearable-interpretation lane,
      one per week:
      - "What HRV actually tells you about tomorrow's lift"
      - "Why your scale is up after a leg day and your body fat is down"
      - "How I read your sleep score" (plain-language Oura/Whoop deconstruction)
      - "When to push and when to back off — for women"
      - "What your wearable can't tell you (and why I ask anyway)"
- [ ] **13. Four pillar pieces** on the cycle-aware-training lane,
      one per week:
      - "Training around the luteal phase"
      - "How I plan a wedding-prep block"
      - "Postpartum: what month one to month six actually looks like"
      - "Travel weeks, treatment weeks, sick weeks — how the plan moves"
- [ ] **14. Internal linking pass.** Every pillar piece links to two
      others and to the landing.

#### Phase 3 (weeks 9–13): compounding

- [ ] **15. Comparison pages.** Once Search Console shows brand
      search volume and at least one "Vita vs X" query has fired,
      write up to three comparison pages. Honest, not hostile.
- [ ] **16. Backlink earnings.** The founder PR track in
      CAMPAIGN_90D.md is the backlink strategy. Every press feature
      should link to a specific pillar page, not just the homepage.
- [ ] **17. Landing speed audit.** Lighthouse CI in GitHub Actions.
      Block deploys that drop Core Web Vitals below thresholds.
- [ ] **18. App Store / Play Store ASO** when (if) mobile apps ship.
      Out of scope for web SEO but feeds the same brand-search
      gravitational well.

---

## What this audit deliberately doesn't recommend

- **No "AI fitness app" keyword chasing in the title tag.** Generic
  high-volume keywords are won by domain authority Vita doesn't have
  yet. Long-tail wins first. Title is brand + niche, not generic.
- **No SEO content factory.** Ten articles per week with thin content
  doesn't work in 2026. The pillar approach (one pillar/week, founder-
  written, real expertise) does. Quality over volume, by a wide margin.
- **No paid SEO tools (Ahrefs, Semrush) before the domain is live.**
  They're useful but cost $99–$399/mo and the data isn't actionable
  until there's a domain to track.
- **No reciprocal link schemes, guest-post networks, or directory
  submissions.** All Google-penalized or worthless. The backlink
  strategy is press features, advisor co-signs, and pillar content
  that earns natural links.
- **No SEO subdomain (blog.vita.app or content.vita.app).** Authority
  splits across subdomains. Keep `/journal` on the root.
- **No AMP.** Deprecated.
- **No copy stuffed with keywords for ranking.** The brand voice
  forbids it (brand/VITA-BRAND.md). The growth-hacker test fails immediately.

---

## Review cadence

- **Weekly (10 min):** Search Console — new queries, click-through
  rate, any pages with impressions but zero clicks (title/description
  problem).
- **Monthly (30 min):** Top 20 ranking queries. Top 10 pages by
  impressions. Cross-reference with CAMPAIGN_90D.md content. Any
  pillar piece getting traction → write a follow-up.
- **Quarterly (90 min):** Full audit refresh. Re-run this checklist.
  Re-evaluate keyword tiers based on what actually moved trials.

Don't fork this document. Append a "Q2 review" section. The audit
compounds, like the brand.
