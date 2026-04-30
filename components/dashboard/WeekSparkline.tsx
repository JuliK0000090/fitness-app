"use client";

/**
 * 7-day sparkline. Each day is a thin vertical bar; bars that crossed
 * the target tint sage, others stay champagne. Missing days render as
 * a faint placeholder so gaps in the data are visible (rather than
 * silently showing a flat trend).
 *
 * Mobile-first: bars stretch to fill width, hint labels under each bar.
 */

type Props = {
  days: { date: string; value: number | null }[];
  target: number;
  unit: "steps" | "min" | "hours";
};

export function WeekSparkline({ days, target, unit }: Props) {
  const max = Math.max(target, ...days.map((d) => d.value ?? 0));
  const safeMax = max > 0 ? max : 1;

  return (
    <div className="border border-border-subtle bg-bg-surface rounded-md p-4">
      <div className="grid grid-cols-7 gap-2 items-end h-20">
        {days.map((d) => {
          const v = d.value ?? 0;
          const pct = (v / safeMax) * 100;
          const hit = d.value !== null && d.value >= target;
          const empty = d.value === null;
          return (
            <div key={d.date} className="flex flex-col items-center gap-1.5">
              <div className="flex-1 w-full flex items-end">
                {empty ? (
                  <div className="w-full h-1 rounded-sm bg-border-subtle/40" />
                ) : (
                  <div
                    className={`w-full rounded-sm transition-all ${hit ? "bg-sage" : "bg-champagne/80"}`}
                    style={{ height: `${Math.max(2, pct)}%` }}
                    title={`${d.date}: ${Math.round(v)} ${unit}`}
                  />
                )}
              </div>
              <p className="text-[10px] tabular-nums text-text-disabled">{labelFor(d.date)}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function labelFor(yyyymmdd: string): string {
  const dow = new Date(yyyymmdd + "T12:00:00Z").getUTCDay();
  return ["Su", "M", "Tu", "W", "Th", "F", "Sa"][dow];
}
