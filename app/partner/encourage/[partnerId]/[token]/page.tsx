import { getISOWeek, getYear } from "date-fns";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const MAX_LEN = 280;

export default async function EncouragePartner({
  params,
}: {
  params: Promise<{ partnerId: string; token: string }>;
}) {
  const { partnerId, token } = await params;

  const partner = await prisma.accountabilityPartner.findUnique({
    where: { id: partnerId },
    include: { user: { select: { name: true, email: true } } },
  });

  if (!partner || partner.inviteToken !== token || partner.status !== "ACCEPTED") {
    return (
      <div className="min-h-screen bg-bg-base flex items-center justify-center px-6">
        <div className="max-w-md text-center space-y-4">
          <h1 className="font-serif text-display-md font-light text-text-primary">Link expired.</h1>
          <p className="text-body text-text-muted">This encouragement link is no longer valid.</p>
        </div>
      </div>
    );
  }

  const userFirstName = (partner.user.name ?? partner.user.email.split("@")[0]).split(" ")[0];

  // Has a note for this ISO week already been sent?
  const now = new Date();
  const weekOfYear = getISOWeek(now);
  const yearNumber = getYear(now);
  const already = await prisma.partnerEncouragement.findUnique({
    where: { partnerId_weekOfYear_yearNumber: { partnerId: partner.id, weekOfYear, yearNumber } },
  });

  if (already) {
    return (
      <div className="min-h-screen bg-bg-base flex items-center justify-center px-6">
        <div className="max-w-md text-center space-y-4">
          <h1 className="font-serif text-display-md font-light text-text-primary">Already sent this week.</h1>
          <p className="text-body text-text-muted">
            One per week, on purpose. {userFirstName}&apos;s next note slot opens Sunday.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-base flex items-center justify-center px-6 py-12">
      <div className="max-w-md w-full space-y-8">
        <div className="space-y-2">
          <h1 className="font-serif text-display-xl font-light text-text-primary leading-tight">
            One line for {userFirstName}.
          </h1>
          <p className="text-body text-text-muted">
            Lands in her app. She&apos;ll know it&apos;s from you.
          </p>
        </div>

        <form action={`/api/partner/encourage/${partnerId}/${token}`} method="POST" className="space-y-3">
          <textarea
            name="message"
            required
            minLength={1}
            maxLength={MAX_LEN}
            rows={4}
            placeholder="Proud of you. Keep going."
            className="w-full bg-bg-surface border border-border-default rounded px-3 py-2.5 text-body text-text-primary resize-none"
          />
          <p className="text-caption text-text-disabled">{MAX_LEN} characters max.</p>
          <button
            type="submit"
            className="w-full py-3 rounded bg-champagne text-champagne-fg text-body font-medium hover:bg-champagne-soft transition-colors"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
