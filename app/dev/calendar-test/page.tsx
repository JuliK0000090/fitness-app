/**
 * Visual smoke test for the calendar render rules.
 *
 * Renders one row per state combination and prints the resulting dots and
 * ring. Open in dev only (gated by NODE_ENV).
 *
 * Each row's "expected" column is the spec's prescribed behaviour. The
 * "actual" column is what dotsForDay/ringForDay produce. Any mismatch is
 * a bug in the rules.
 */

import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  CalendarDayState, dotsForDay, ringForDay,
  DOT_CLASS, RING_STROKE,
} from "@/lib/calendar/render-rules";

export const dynamic = "force-dynamic";

type Scenario = {
  label: string;
  state: CalendarDayState;
  expectedDots: string;
  expectedRing: string;
};

const SCENARIOS: Scenario[] = [
  {
    label: "Past day, no workouts, no habits",
    state: { phase: "past", workouts: [], habitCompletions: [], totalHabitsForDay: 0 },
    expectedDots: "no dots",
    expectedRing: "no ring",
  },
  {
    label: "Past day, 1 workout DONE, all habits done",
    state: {
      phase: "past",
      workouts: [{ status: "DONE", source: "manual" }],
      habitCompletions: [{ status: "DONE" }, { status: "DONE" }, { status: "DONE" }],
      totalHabitsForDay: 3,
    },
    expectedDots: "1 done (champagne)",
    expectedRing: "full done ring (champagne)",
  },
  {
    label: "Past day, 2 workouts SKIPPED, 50% habits",
    state: {
      phase: "past",
      workouts: [
        { status: "SKIPPED", source: "manual" },
        { status: "SKIPPED", source: "manual" },
      ],
      habitCompletions: [{ status: "DONE" }, { status: "MISSED" }],
      totalHabitsForDay: 2,
    },
    expectedDots: "2 skipped (subtle)",
    expectedRing: "partial ring (champagne/45)",
  },
  {
    label: "Past day, 1 workout MISSED, 0% habits",
    state: {
      phase: "past",
      workouts: [{ status: "MISSED", source: "ai_suggested" }],
      habitCompletions: [{ status: "MISSED" }, { status: "MISSED" }],
      totalHabitsForDay: 2,
    },
    expectedDots: "1 missed (terracotta/40)",
    expectedRing: "missed ring (0%, terracotta/40)",
  },
  {
    label: "Today, 1 workout PLANNED, 30% habits done so far",
    state: {
      phase: "today",
      workouts: [{ status: "PLANNED", source: "manual" }],
      habitCompletions: [{ status: "DONE" }],
      totalHabitsForDay: 3,
    },
    expectedDots: "1 planned (border-strong)",
    expectedRing: "partial ring 33%",
  },
  {
    label: "Future day, 2 workouts PLANNED — must NOT show ring",
    state: {
      phase: "future",
      workouts: [
        { status: "PLANNED", source: "manual" },
        { status: "PLANNED", source: "ai_suggested" },
      ],
      habitCompletions: [],
      totalHabitsForDay: 3,
    },
    expectedDots: "1 planned + 1 suggests",
    expectedRing: "NO ring",
  },
  {
    label: "Future day, 1 workout DONE — DATA BUG, should be skipped + warned",
    state: {
      phase: "future",
      workouts: [{ status: "DONE", source: "manual" }],
      habitCompletions: [],
      totalHabitsForDay: 0,
    },
    expectedDots: "no dots (warning logged)",
    expectedRing: "NO ring",
  },
  {
    label: "Future day, MOVED workout from earlier date",
    state: {
      phase: "future",
      workouts: [{ status: "MOVED", source: "ai_suggested" }],
      habitCompletions: [],
      totalHabitsForDay: 0,
    },
    expectedDots: "1 planned",
    expectedRing: "NO ring",
  },
  {
    label: "Future day, AUTO_SKIPPED — also a data bug, never auto-skip ahead of time",
    state: {
      phase: "future",
      workouts: [{ status: "AUTO_SKIPPED", source: "ai_suggested" }],
      habitCompletions: [],
      totalHabitsForDay: 0,
    },
    expectedDots: "no dots (warning logged)",
    expectedRing: "NO ring",
  },
];

function Ring({ ring }: { ring: ReturnType<typeof ringForDay> }) {
  if (!ring.show) return <span className="text-caption text-text-disabled">—</span>;
  const size = 16;
  const r = (size - 2) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - ring.fillRatio);
  return (
    <svg width={size} height={size} className="-rotate-90" aria-hidden>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(212,196,168,0.12)" strokeWidth={1.5} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        className={RING_STROKE[ring.color]}
        strokeWidth={1.5}
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round"
      />
    </svg>
  );
}

// Comma-separated list of admin emails who can view dev pages even in
// production (no env-var dance required). Falls back to a hard-coded list
// if not set on the host. The page renders only synthetic data, so the risk
// of widening access is purely whether you want strangers seeing the
// internals.
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? "juliana.kolarski@gmail.com")
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

async function isAdmin(): Promise<boolean> {
  const session = await getSession();
  if (!session) return false;
  const u = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { email: true },
  });
  return !!u && ADMIN_EMAILS.includes(u.email.toLowerCase());
}

export default async function CalendarTestPage() {
  // Production: allow if env var explicitly set OR if signed-in user is admin.
  // Dev: always allow.
  if (process.env.NODE_ENV === "production"
      && process.env.ENABLE_DEV_PAGES !== "1"
      && !(await isAdmin())) {
    notFound();
  }

  return (
    <div className="max-w-4xl mx-auto px-5 py-10 space-y-6">
      <h1 className="text-display-sm font-serif font-light">Calendar render-rules smoke test</h1>
      <p className="text-body-sm text-text-muted">
        One row per state combination. The "actual" column is the live output of
        <code className="mx-1 text-caption">dotsForDay()</code> /
        <code className="mx-1 text-caption">ringForDay()</code>. Any mismatch with
        the "expected" column is a bug in the rules.
      </p>

      <div className="border border-border-subtle bg-bg-surface rounded-md overflow-hidden">
        <div className="grid grid-cols-12 gap-3 px-4 py-2 bg-bg-elevated text-caption text-text-disabled font-medium">
          <div className="col-span-5">Scenario</div>
          <div className="col-span-2">Dots (actual)</div>
          <div className="col-span-1">Ring</div>
          <div className="col-span-2">Dots expected</div>
          <div className="col-span-2">Ring expected</div>
        </div>

        {SCENARIOS.map((sc, i) => {
          const dots = dotsForDay(sc.state);
          const ring = ringForDay(sc.state);
          return (
            <div key={i} className="grid grid-cols-12 gap-3 px-4 py-3 border-t border-border-subtle items-center">
              <div className="col-span-5 text-body-sm text-text-secondary">{sc.label}</div>

              <div className="col-span-2 flex items-center gap-1.5 flex-wrap">
                {dots.length === 0 ? (
                  <span className="text-caption text-text-disabled">no dots</span>
                ) : (
                  dots.map((d, j) => (
                    <span key={j} className="flex items-center gap-1">
                      <span className={`inline-block w-1.5 h-1.5 rounded-full ${DOT_CLASS[d.color]}`} />
                      <span className="text-caption text-text-disabled">{d.color}</span>
                    </span>
                  ))
                )}
              </div>

              <div className="col-span-1">
                <Ring ring={ring} />
              </div>

              <div className="col-span-2 text-caption text-text-muted">{sc.expectedDots}</div>
              <div className="col-span-2 text-caption text-text-muted">{sc.expectedRing}</div>
            </div>
          );
        })}
      </div>

      <p className="text-caption text-text-disabled">
        Phase: past / today / future.<br />
        Future days never produce "done" colours and never show a ring.<br />
        DONE / AUTO_SKIPPED on a future date is a data bug — handler logs a warning, no dot rendered.
      </p>
    </div>
  );
}
