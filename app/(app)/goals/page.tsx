import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { GoalCard } from "@/components/cards/GoalCard";
import Link from "next/link";
import { Target, MessageSquarePlus } from "lucide-react";

export default async function GoalsPage() {
  const session = await requireSession();
  const goals = await prisma.goal.findMany({
    where: { userId: session.userId },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });

  const active = goals.filter((g) => g.status === "active");
  const other = goals.filter((g) => g.status !== "active");

  return (
    <div className="max-w-lg mx-auto py-4 px-4 space-y-4">
      <div className="flex items-center gap-3 fu">
        <div className="w-9 h-9 rounded-2xl bg-[#34D399]/20 flex items-center justify-center">
          <Target size={18} className="text-[#34D399]" />
        </div>
        <div>
          <h1 className="text-lg font-bold">Goals</h1>
          <p className="text-xs text-muted-foreground">{active.length} active</p>
        </div>
      </div>

      {active.length === 0 && (
        <div className="glass rounded-2xl p-6 text-center fu2">
          <Target size={32} className="mx-auto mb-3 text-muted-foreground opacity-40" />
          <p className="text-sm text-muted-foreground mb-4">No active goals yet.</p>
          <Link
            href="/chat"
            className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-[#34D399]/10 text-[#34D399] hover:bg-[#34D399]/20 transition-colors"
          >
            <MessageSquarePlus size={12} />
            Set a goal with Vita
          </Link>
        </div>
      )}

      {active.map((g) => (
        <GoalCard
          key={g.id}
          goalId={g.id}
          description={g.description}
          direction={g.direction}
          magnitude={g.magnitude ?? undefined}
          unit={g.unit ?? undefined}
          deadline={g.deadline?.toISOString()}
          status={g.status}
          predictedHitDate={g.predictedHitDate?.toISOString()}
        />
      ))}

      {other.length > 0 && (
        <>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide pt-2">Past goals</p>
          {other.map((g) => (
            <GoalCard
              key={g.id}
              goalId={g.id}
              description={g.description}
              direction={g.direction}
              magnitude={g.magnitude ?? undefined}
              unit={g.unit ?? undefined}
              deadline={g.deadline?.toISOString()}
              status={g.status}
              predictedHitDate={g.predictedHitDate?.toISOString()}
            />
          ))}
        </>
      )}
    </div>
  );
}
