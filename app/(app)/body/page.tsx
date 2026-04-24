import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BodyView } from "./BodyView";
import { renderAvatarSvg } from "@/lib/avatar/render";
import { DEFAULT_AVATAR_DEFINITION } from "@/lib/avatar/types";
import type { AvatarDefinition } from "@/lib/avatar/types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any;

export default async function BodyPage() {
  const session = await requireSession();
  const userId = session.userId;

  const measurements = await prisma.measurement.findMany({
    where: { userId },
    orderBy: { capturedAt: "desc" },
    take: 100,
  });

  const photos = await prisma.photo.findMany({
    where: { userId },
    orderBy: { capturedAt: "desc" },
    take: 20,
  });

  const now = new Date();

  const [avatar, milestones, events] = await Promise.all([
    db.avatar.findUnique({ where: { userId } }),
    db.avatarMilestone.findMany({
      where: { userId, date: { gte: now } },
      orderBy: { date: "asc" },
      take: 5,
    }),
    db.avatarEvent.findMany({
      where: { userId, date: { gte: now } },
      orderBy: { date: "asc" },
      take: 3,
    }),
  ]);

  // Group measurements by kind
  const byKind: Record<string, typeof measurements> = {};
  for (const m of measurements) {
    if (!byKind[m.kind]) byKind[m.kind] = [];
    byKind[m.kind].push(m);
  }
  const latestByKind: Record<string, (typeof measurements)[0]> = {};
  for (const [kind, items] of Object.entries(byKind)) {
    latestByKind[kind] = items[0];
  }

  // Render current avatar SVG
  const currentDef = (avatar?.definition ?? DEFAULT_AVATAR_DEFINITION) as AvatarDefinition;
  const avatarSvg = renderAvatarSvg(currentDef);

  // Render milestone SVGs
  const milestoneSvgs: Record<string, string> = {};
  for (const m of milestones as any[]) {
    const mDef: AvatarDefinition = {
      ...currentDef,
      evolution: Math.min(4, m.evolution) as 0 | 1 | 2 | 3 | 4,
      glow: Math.min(3, m.glow) as 0 | 1 | 2 | 3,
      pose: m.pose as AvatarDefinition["pose"],
      outfit: m.outfit as AvatarDefinition["outfit"],
      background: m.background as AvatarDefinition["background"],
    };
    milestoneSvgs[m.id] = renderAvatarSvg(mDef);
  }

  // Render event SVGs
  const eventSvgs: Record<string, string> = {};
  for (const ev of events as any[]) {
    const evDef: AvatarDefinition = {
      ...currentDef,
      evolution: 4,
      glow: 3,
      pose: ev.pose as AvatarDefinition["pose"],
      outfit: ev.outfit as AvatarDefinition["outfit"],
      background: ev.background as AvatarDefinition["background"],
    };
    eventSvgs[ev.id] = renderAvatarSvg(evDef);
  }

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
      avatarProps={{
        definition: currentDef,
        visibility: (avatar?.visibility ?? "ON") as "ON" | "LIMITED" | "OFF",
        style: (avatar?.style ?? "ABSTRACT") as "ABSTRACT" | "ILLUSTRATED",
        milestones: (milestones as any[]).map((m: any) => ({
          id: m.id,
          date: m.date.toISOString(),
          label: m.label,
          evolution: m.evolution,
          glow: m.glow,
          pose: m.pose,
          note: m.note,
          predicted: m.predicted,
        })),
        events: (events as any[]).map((ev: any) => ({
          id: ev.id,
          title: ev.title,
          date: ev.date.toISOString(),
          outfit: ev.outfit,
          background: ev.background,
          pose: ev.pose,
          note: ev.note,
        })),
        avatarSvg,
        milestoneSvgs,
        eventSvgs,
      }}
    />
  );
}
