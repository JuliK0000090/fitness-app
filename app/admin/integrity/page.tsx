/**
 * Admin integrity / system-health dashboard.
 *
 * Surfaces:
 *   - Unresolved IntegrityAlert rows (hourly sweep canary)
 *   - Last 24h NotificationLog grouped by category x skipReason
 *   - Last 24h Email rows by status (Resend health)
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

// All impure date math + db reads live in this async helper, so the
// component body stays render-pure (satisfies react-hooks/purity).
async function loadIntegrityData() {
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [unresolved, recentResolved, notifLogs, emails] = await Promise.all([
    prisma.integrityAlert.findMany({
      where: { resolvedAt: null },
      orderBy: { detectedAt: "desc" },
      take: 30,
    }),
    prisma.integrityAlert.findMany({
      where: { resolvedAt: { gte: since24h } },
      orderBy: { resolvedAt: "desc" },
      take: 10,
    }),
    prisma.notificationLog.findMany({
      where: { sentAt: { gte: since24h } },
      select: { category: true, skipReason: true, delivered: true },
    }),
    prisma.email.findMany({
      where: { createdAt: { gte: since24h } },
      select: { status: true, templateId: true },
    }),
  ]);

  // Group notif logs by category | outcome
  const notifByGroup = new Map<string, number>();
  for (const r of notifLogs) {
    const key = `${r.category} | ${r.delivered ? "DELIVERED" : (r.skipReason ?? "no-reason")}`;
    notifByGroup.set(key, (notifByGroup.get(key) ?? 0) + 1);
  }
  const notifRows = Array.from(notifByGroup.entries())
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count);

  // Group emails by template | status
  const emailByGroup = new Map<string, number>();
  for (const r of emails) {
    const key = `${r.templateId} | ${r.status}`;
    emailByGroup.set(key, (emailByGroup.get(key) ?? 0) + 1);
  }
  const emailRows = Array.from(emailByGroup.entries())
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count);

  return { unresolved, recentResolved, notifRows, emailRows };
}

export default async function AdminIntegrityPage() {
  const auth = await isAdmin();
  if (!auth.ok) notFound();

  const { unresolved, recentResolved, notifRows, emailRows } = await loadIntegrityData();

  return (
    <div className="min-h-screen bg-bg-base px-5 py-10">
      <div className="max-w-5xl mx-auto space-y-10">
        <div className="flex items-baseline justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-display-sm font-serif font-light">System health</h1>
            <p className="text-caption text-text-disabled mt-1">Signed in as {auth.email}</p>
          </div>
          <Link href="/admin/users" className="text-caption text-text-muted hover:text-text-primary">
            ← users
          </Link>
        </div>

        {/* Integrity alerts */}
        <section className="space-y-3">
          <p className="text-label tracking-widest uppercase text-text-disabled font-sans font-medium">
            Open integrity alerts
          </p>
          {unresolved.length === 0 ? (
            <div className="border border-sage/30 bg-sage/[0.06] rounded-md px-4 py-3">
              <p className="text-body-sm text-text-secondary">All temporal invariants holding. No open alerts.</p>
            </div>
          ) : (
            <div className="border border-terracotta/40 bg-terracotta/[0.06] rounded-md p-3 space-y-2">
              {unresolved.map((a) => (
                <div key={a.id} className="text-caption">
                  <p className="text-text-primary">
                    <span className="font-mono">{a.rule}</span> · {a.count} row{a.count === 1 ? "" : "s"} in <span className="font-mono">{a.table}</span>
                  </p>
                  <p className="text-text-muted">first seen {formatDistanceToNow(a.detectedAt, { addSuffix: true })}</p>
                </div>
              ))}
            </div>
          )}
          {recentResolved.length > 0 && (
            <details className="text-caption">
              <summary className="text-text-disabled cursor-pointer">Recently resolved ({recentResolved.length})</summary>
              <div className="mt-2 space-y-1">
                {recentResolved.map((a) => (
                  <p key={a.id} className="text-text-disabled">
                    <span className="font-mono">{a.rule}</span> resolved {formatDistanceToNow(a.resolvedAt!, { addSuffix: true })}
                  </p>
                ))}
              </div>
            </details>
          )}
        </section>

        {/* Notification health */}
        <section className="space-y-3">
          <p className="text-label tracking-widest uppercase text-text-disabled font-sans font-medium">
            Push notifications — last 24h
          </p>
          <div className="border border-border-subtle bg-bg-surface rounded-md overflow-hidden">
            <table className="min-w-full text-caption">
              <thead className="bg-bg-elevated text-text-disabled">
                <tr>
                  <th className="text-left px-3 py-2 font-medium">Category · Outcome</th>
                  <th className="text-right px-3 py-2 font-medium">Count</th>
                </tr>
              </thead>
              <tbody>
                {notifRows.map((r) => (
                  <tr key={r.key} className="border-t border-border-subtle">
                    <td className="px-3 py-2 font-mono text-text-secondary">{r.key}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-text-primary">{r.count}</td>
                  </tr>
                ))}
                {notifRows.length === 0 && (
                  <tr><td colSpan={2} className="px-3 py-6 text-center text-text-disabled">No notifications attempted in last 24h.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <p className="text-caption text-text-disabled">
            Healthy: lots of <span className="font-mono">DELIVERED</span> rows, some <span className="font-mono">quiet-hours</span>, some <span className="font-mono">category-disabled</span>.
            <span className="font-mono"> vapid-not-configured</span> means VAPID env vars dropped on Railway.
          </p>
        </section>

        {/* Email health */}
        <section className="space-y-3">
          <p className="text-label tracking-widest uppercase text-text-disabled font-sans font-medium">
            Email — last 24h
          </p>
          <div className="border border-border-subtle bg-bg-surface rounded-md overflow-hidden">
            <table className="min-w-full text-caption">
              <thead className="bg-bg-elevated text-text-disabled">
                <tr>
                  <th className="text-left px-3 py-2 font-medium">Template · Status</th>
                  <th className="text-right px-3 py-2 font-medium">Count</th>
                </tr>
              </thead>
              <tbody>
                {emailRows.map((r) => (
                  <tr key={r.key} className="border-t border-border-subtle">
                    <td className="px-3 py-2 font-mono text-text-secondary">{r.key}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-text-primary">{r.count}</td>
                  </tr>
                ))}
                {emailRows.length === 0 && (
                  <tr><td colSpan={2} className="px-3 py-6 text-center text-text-disabled">No emails sent in last 24h.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
