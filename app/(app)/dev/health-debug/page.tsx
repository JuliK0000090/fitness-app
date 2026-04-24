import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ReprocessButton, SimulateButton } from "./DebugActions";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any;

const ORIGIN = process.env.NEXT_PUBLIC_APP_URL ?? "https://fitness-app-production-2ef2.up.railway.app";

export default async function HealthDebugPage() {
  // Only available in development or with HEALTH_DEBUG=1
  if (process.env.NODE_ENV !== "development" && process.env.HEALTH_DEBUG !== "1") {
    return (
      <div className="max-w-lg mx-auto px-4 py-8">
        <p className="text-sm text-muted-foreground">Not available in production.</p>
      </div>
    );
  }

  const session = await requireSession();
  const userId = session.userId;

  const [rawPayloads, dailyRows, integration] = await Promise.all([
    db.haeRaw.findMany({
      where: { userId },
      orderBy: { receivedAt: "desc" },
      take: 20,
      select: { id: true, receivedAt: true, metricCount: true, workoutCount: true, processed: true, error: true },
    }),
    db.haeDaily.findMany({
      where: { userId },
      orderBy: { date: "desc" },
      take: 7,
    }),
    db.healthIntegration.findUnique({
      where: { userId },
    }),
  ]);

  const webhookUrl = integration
    ? `${ORIGIN}/api/webhooks/hae/${integration.webhookToken}`
    : null;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
      <div>
        <h1 className="text-xl font-semibold mb-1">Health Debug</h1>
        <p className="text-xs text-muted-foreground">Internal view. Not visible to users.</p>
      </div>

      {/* Integration */}
      <section>
        <h2 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">Integration</h2>
        <div className="glass rounded-2xl p-4 font-mono text-xs space-y-1 text-muted-foreground">
          {integration ? (
            <>
              <p>active: <span className="text-foreground">{String(integration.active)}</span></p>
              <p>provider: <span className="text-foreground">{integration.provider}</span></p>
              <p>lastPayloadAt: <span className="text-foreground">{integration.lastPayloadAt?.toISOString() ?? "—"}</span></p>
              <p>totalPayloadCount: <span className="text-foreground">{integration.totalPayloadCount}</span></p>
              <p className="break-all">webhookToken: <span className="text-foreground">{integration.webhookToken}</span></p>
              {webhookUrl && (
                <div className="pt-2">
                  <SimulateButton webhookUrl={webhookUrl} />
                </div>
              )}
            </>
          ) : (
            <p>No integration found.</p>
          )}
        </div>
      </section>

      {/* Last 7 daily rows */}
      <section>
        <h2 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">Last 7 Daily Rows</h2>
        {dailyRows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No daily data yet.</p>
        ) : (
          <div className="space-y-2">
            {dailyRows.map((row: any) => (
              <div key={row.date.toISOString()} className="glass rounded-2xl p-4 font-mono text-xs text-muted-foreground">
                <p className="text-foreground font-semibold mb-1">{row.date.toISOString().split("T")[0]}</p>
                <div className="grid grid-cols-3 gap-1">
                  <p>steps: {row.steps ?? "—"}</p>
                  <p>sleep: {row.sleepHours ?? "—"} hr</p>
                  <p>hrv: {row.hrvMs ?? "—"} ms</p>
                  <p>rhr: {row.heartRateResting ?? "—"} bpm</p>
                  <p>workouts: {row.workoutCount ?? "—"}</p>
                  <p>readiness: {row.readinessScore ?? "—"}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Last 20 raw payloads */}
      <section>
        <h2 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">Last 20 Raw Payloads</h2>
        {rawPayloads.length === 0 ? (
          <p className="text-sm text-muted-foreground">No raw payloads yet.</p>
        ) : (
          <div className="space-y-2">
            {rawPayloads.map((row: any) => (
              <div key={row.id} className="glass rounded-2xl p-3 font-mono text-xs text-muted-foreground flex gap-4 flex-wrap items-center">
                <span className="text-foreground">{row.receivedAt.toISOString().replace("T", " ").slice(0, 19)}</span>
                <span>metrics: {row.metricCount}</span>
                <span>workouts: {row.workoutCount}</span>
                <span className={row.processed ? "text-green-400" : "text-yellow-400"}>
                  {row.processed ? "processed" : "pending"}
                </span>
                {row.error && <span className="text-red-400">{row.error}</span>}
                <ReprocessButton rawId={row.id} />
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="pt-4 border-t border-white/5">
        <Link href="/settings/integrations/apple-health" className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors">
          Go to Apple Health settings
        </Link>
      </div>
    </div>
  );
}
