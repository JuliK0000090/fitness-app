import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { IntegrationsView } from "./IntegrationsView";

export default async function IntegrationsPage() {
  const session = await requireSession();
  const devices = await prisma.device.findMany({
    where: { userId: session.userId },
    orderBy: { connectedAt: "desc" },
  });
  return <IntegrationsView devices={devices} />;
}
