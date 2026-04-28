import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PartnerView } from "./PartnerView";

export const dynamic = "force-dynamic";

export default async function PartnerSettingsPage() {
  const session = await requireSession();
  const userId = session.userId;

  const partner = await prisma.accountabilityPartner.findFirst({
    where: { userId, status: { in: ["PENDING", "ACCEPTED"] } },
    include: {
      encouragements: {
        orderBy: { sentAt: "desc" },
        take: 3,
      },
    },
  });

  return (
    <PartnerView
      partner={partner ? {
        id: partner.id,
        partnerName: partner.partnerName,
        partnerEmail: partner.partnerEmail,
        status: partner.status,
        invitedAt: partner.invitedAt.toISOString(),
        acceptedAt: partner.acceptedAt?.toISOString() ?? null,
        encouragements: partner.encouragements.map((e) => ({
          id: e.id,
          message: e.message,
          sentAt: e.sentAt.toISOString(),
        })),
      } : null}
    />
  );
}
