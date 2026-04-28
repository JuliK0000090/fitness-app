/**
 * Admin user-monitoring dashboard.
 *
 * Lists every user (most recent first) with their funnel status,
 * activity signals, and the launch-relevant flags. Read-only.
 *
 * Gate: signed-in user's email must be in ADMIN_EMAILS (env or
 * hard-coded fallback to juliana.kolarski@gmail.com). Same pattern
 * as /dev/calendar-test.
 */

import { notFound } from "next/navigation";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? "juliana.kolarski@gmail.com")
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

export const dynamic = "force-dynamic";

async function isAdmin(): Promise<{ ok: boolean; email?: string }> {
  const session = await getSession();
  if (!session) return { ok: false };
  const u = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { email: true },
  });
  if (!u) return { ok: false };
  if (!ADMIN_EMAILS.includes(u.email.toLowerCase())) return { ok: false };
  return { ok: true, email: u.email };
}

type UserRow = {
  id: string;
  email: string;
  name: string | null;
  createdAt: Date;
  emailVerified: Date | null;
  onboardingComplete: boolean;
  todayMode: string | null;
  timezone: string;
  lastSessionAt: Date | null;
  goalCount: number;
  habitCount: number;
  scheduledFutureCount: number;
  workoutLogsCount: number;
  pushSubsCount: number;
  partner: { partnerName: string; status: string } | null;
};

async function loadUsers(): Promise<UserRow[]> {
  const users = await prisma.user.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: "desc" },
    select: {
      id: true, email: true, name: true, createdAt: true, emailVerified: true,
      onboardingComplete: true, todayMode: true, timezone: true,
      sessions: { orderBy: { createdAt: "desc" }, take: 1, select: { createdAt: true } },
      goals: { where: { status: "active" }, select: { id: true } },
      habits: { where: { active: true }, select: { id: true } },
      pushSubscriptions: { select: { id: true } },
      accountabilityPartners: {
        where: { status: { in: ["PENDING", "ACCEPTED"] } },
        orderBy: { invitedAt: "desc" },
        take: 1,
        select: { partnerName: true, status: true },
      },
    },
  });

  const out: UserRow[] = [];
  for (const u of users) {
    const today = new Date(); today.setUTCHours(0, 0, 0, 0);
    const futureSW = await prisma.scheduledWorkout.count({
      where: { userId: u.id, scheduledDate: { gte: today }, status: "PLANNED" },
    });
    const logs = await prisma.workoutLog.count({ where: { userId: u.id } });
    out.push({
      id: u.id,
      email: u.email,
      name: u.name,
      createdAt: u.createdAt,
      emailVerified: u.emailVerified,
      onboardingComplete: u.onboardingComplete,
      todayMode: u.todayMode,
      timezone: u.timezone,
      lastSessionAt: u.sessions[0]?.createdAt ?? null,
      goalCount: u.goals.length,
      habitCount: u.habits.length,
      scheduledFutureCount: futureSW,
      workoutLogsCount: logs,
      pushSubsCount: u.pushSubscriptions.length,
      partner: u.accountabilityPartners[0]
        ? { partnerName: u.accountabilityPartners[0].partnerName, status: u.accountabilityPartners[0].status }
        : null,
    });
  }
  return out;
}

function FunnelBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={`inline-block text-[10px] px-1.5 py-0.5 rounded ${ok ? "bg-sage/20 text-sage" : "bg-border-subtle text-text-disabled"}`}>
      {label}
    </span>
  );
}

export default async function AdminUsersPage() {
  const auth = await isAdmin();
  if (!auth.ok) notFound();

  const users = await loadUsers();

  // Aggregates
  const aggregates = computeAggregates(users);
  const { total, verified, onboarded, withGoal, withSchedule,
          completedAtLeastOne, newLast7d, activeLast24h } = aggregates;

  return (
    <div className="min-h-screen bg-bg-base px-5 py-10">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex items-baseline justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-display-sm font-serif font-light">Users</h1>
            <p className="text-caption text-text-disabled mt-1">Signed in as {auth.email}</p>
          </div>
          <Link href="/today" className="text-caption text-text-muted hover:text-text-primary">
            ← back to app
          </Link>
        </div>

        {/* Funnel summary */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat label="Total users"           value={total} />
          <Stat label="New (7d)"              value={newLast7d} />
          <Stat label="Active (24h)"          value={activeLast24h} />
          <Stat label="Email verified"        value={verified} sub={total > 0 ? `${Math.round((verified / total) * 100)}%` : ""} />
          <Stat label="Onboarded"             value={onboarded} sub={total > 0 ? `${Math.round((onboarded / total) * 100)}%` : ""} />
          <Stat label="Has active goal"       value={withGoal} sub={total > 0 ? `${Math.round((withGoal / total) * 100)}%` : ""} />
          <Stat label="Has schedule"          value={withSchedule} sub={total > 0 ? `${Math.round((withSchedule / total) * 100)}%` : ""} />
          <Stat label="Completed ≥1 workout"  value={completedAtLeastOne} sub={total > 0 ? `${Math.round((completedAtLeastOne / total) * 100)}%` : ""} />
        </section>

        {/* Per-user table */}
        <section className="border border-border-subtle bg-bg-surface rounded-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-caption">
              <thead className="bg-bg-elevated text-text-disabled">
                <tr>
                  <th className="text-left px-3 py-2 font-medium">User</th>
                  <th className="text-left px-3 py-2 font-medium">Created</th>
                  <th className="text-left px-3 py-2 font-medium">Last login</th>
                  <th className="text-left px-3 py-2 font-medium">Funnel</th>
                  <th className="text-right px-3 py-2 font-medium">Goals</th>
                  <th className="text-right px-3 py-2 font-medium">Habits</th>
                  <th className="text-right px-3 py-2 font-medium">Future SW</th>
                  <th className="text-right px-3 py-2 font-medium">Logs</th>
                  <th className="text-right px-3 py-2 font-medium">Push</th>
                  <th className="text-left px-3 py-2 font-medium">Partner</th>
                  <th className="text-left px-3 py-2 font-medium">TZ</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-t border-border-subtle">
                    <td className="px-3 py-2">
                      <p className="text-text-primary">{u.name ?? <span className="text-text-disabled italic">no name</span>}</p>
                      <p className="text-text-disabled text-[10px] truncate max-w-[180px]">{u.email}</p>
                    </td>
                    <td className="px-3 py-2 text-text-muted">{formatDistanceToNow(u.createdAt, { addSuffix: true })}</td>
                    <td className="px-3 py-2 text-text-muted">
                      {u.lastSessionAt ? formatDistanceToNow(u.lastSessionAt, { addSuffix: true }) : <span className="text-text-disabled italic">never</span>}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-1">
                        <FunnelBadge ok={!!u.emailVerified}        label="verified" />
                        <FunnelBadge ok={u.onboardingComplete}      label="onboarded" />
                        <FunnelBadge ok={u.scheduledFutureCount > 0} label="scheduled" />
                        <FunnelBadge ok={u.workoutLogsCount > 0}     label="logged" />
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-text-secondary">{u.goalCount}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-text-secondary">{u.habitCount}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-text-secondary">{u.scheduledFutureCount}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-text-secondary">{u.workoutLogsCount}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-text-secondary">{u.pushSubsCount}</td>
                    <td className="px-3 py-2 text-text-muted">
                      {u.partner ? `${u.partner.partnerName} (${u.partner.status})` : <span className="text-text-disabled">—</span>}
                    </td>
                    <td className="px-3 py-2 text-text-disabled font-mono text-[10px]">{u.timezone}</td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr><td colSpan={11} className="px-3 py-8 text-center text-text-disabled">No users.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <p className="text-caption text-text-disabled">
          Funnel order: <span className="text-text-secondary">verified → onboarded → scheduled → logged</span>.
          A green badge means that step is complete. Look for users stuck at one step — that&apos;s where the flow is breaking.
        </p>

        <section className="space-y-2 pt-4 border-t border-border-subtle">
          <p className="text-label tracking-widest uppercase text-text-disabled font-sans font-medium">Other admin pages</p>
          <ul className="text-caption text-text-secondary space-y-1">
            <li>• <Link href="/admin/integrity" className="text-champagne underline">/admin/integrity</Link> — unresolved IntegrityAlert rows + recent NotificationLog skips</li>
            <li>• <Link href="/dev/calendar-test" className="text-champagne underline">/dev/calendar-test</Link> — calendar render-rules visual smoke test</li>
          </ul>
        </section>
      </div>
    </div>
  );
}

// Pure-but-uses-Date.now: kept as a top-level helper (not in render) so
// the component body satisfies react-hooks/purity.
function computeAggregates(users: UserRow[]) {
  const now = Date.now();
  const since7d = new Date(now - 7 * 24 * 60 * 60 * 1000);
  const since24h = new Date(now - 24 * 60 * 60 * 1000);
  return {
    total: users.length,
    verified: users.filter((u) => u.emailVerified).length,
    onboarded: users.filter((u) => u.onboardingComplete).length,
    withGoal: users.filter((u) => u.goalCount > 0).length,
    withSchedule: users.filter((u) => u.scheduledFutureCount > 0).length,
    completedAtLeastOne: users.filter((u) => u.workoutLogsCount > 0).length,
    newLast7d: users.filter((u) => u.createdAt >= since7d).length,
    activeLast24h: users.filter((u) => u.lastSessionAt && u.lastSessionAt >= since24h).length,
  };
}

function Stat({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return (
    <div className="border border-border-subtle bg-bg-surface rounded-md px-4 py-3">
      <p className="text-caption text-text-disabled">{label}</p>
      <p className="font-serif text-display-md font-light text-text-primary tabular-nums">{value}</p>
      {sub && <p className="text-caption text-text-muted">{sub}</p>}
    </div>
  );
}
