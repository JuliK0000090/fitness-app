import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BodyView } from "./BodyView";

export default async function BodyPage() {
  const session = await requireSession();
  const userId = session.userId;

  const measurements = await prisma.measurement.findMany({
    where: { userId },
    orderBy: { capturedAt: "desc" },
    take: 100,
  });

  // Group by kind
  const byKind = measurements.reduce<Record<string, typeof measurements>>((acc, m) => {
    if (!acc[m.kind]) acc[m.kind] = [];
    acc[m.kind].push(m);
    return acc;
  }, {});

  // Latest per kind
  const latestByKind = Object.fromEntries(
    Object.entries(byKind).map(([kind, items]) => [kind, items[0]])
  );

  const photos = await prisma.photo.findMany({
    where: { userId },
    orderBy: { capturedAt: "desc" },
    take: 20,
  });

  return (
    <BodyView
      measurements={Object.values(latestByKind).map((m) => ({
        id: m.id,
        kind: m.kind,
        value: m.value,
        unit: m.unit,
        capturedAt: m.capturedAt.toISOString(),
        history: (byKind[m.kind] ?? []).slice(0, 10).map((h) => ({
          value: h.value,
          capturedAt: h.capturedAt.toISOString(),
        })),
      }))}
      photos={photos.map((p) => ({
        id: p.id,
        url: `${process.env.NEXT_PUBLIC_R2_PUBLIC_URL ?? ""}/${p.r2Key}`,
        pose: p.pose,
        capturedAt: p.capturedAt.toISOString(),
      }))}
    />
  );
}
