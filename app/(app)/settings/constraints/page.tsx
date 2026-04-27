import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ConstraintsView } from "./ConstraintsView";

export default async function ConstraintsPage() {
  const session = await requireSession();
  const constraints = await prisma.plannerConstraint.findMany({
    where: { userId: session.userId },
    orderBy: [{ active: "desc" }, { startDate: "desc" }],
  });

  return (
    <ConstraintsView
      initial={constraints.map((c) => ({
        id: c.id,
        type: c.type,
        scope: c.scope,
        startDate: c.startDate.toISOString().split("T")[0],
        endDate: c.endDate ? c.endDate.toISOString().split("T")[0] : null,
        payload: c.payload as Record<string, unknown>,
        reason: c.reason,
        source: c.source,
        active: c.active,
      }))}
    />
  );
}
