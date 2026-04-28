import { redirect } from "next/navigation";
import { differenceInDays } from "date-fns";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

const INVITE_EXPIRY_DAYS = 7;

export const dynamic = "force-dynamic";

export default async function AcceptPartnerInvite({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const partner = await prisma.accountabilityPartner.findUnique({
    where: { inviteToken: token },
    include: { user: { select: { name: true, email: true } } },
  });

  if (!partner) {
    return (
      <div className="min-h-screen bg-bg-base flex items-center justify-center px-6">
        <div className="max-w-md text-center space-y-4">
          <h1 className="font-serif text-display-md font-light text-text-primary">Invite not found.</h1>
          <p className="text-body text-text-muted">The link is wrong or has been cancelled.</p>
        </div>
      </div>
    );
  }

  if (partner.status === "ACCEPTED") {
    return (
      <div className="min-h-screen bg-bg-base flex items-center justify-center px-6">
        <div className="max-w-md text-center space-y-4">
          <h1 className="font-serif text-display-md font-light text-text-primary">You&apos;re in.</h1>
          <p className="text-body text-text-muted">First weekly note arrives Sunday.</p>
        </div>
      </div>
    );
  }

  if (partner.status !== "PENDING") {
    return (
      <div className="min-h-screen bg-bg-base flex items-center justify-center px-6">
        <div className="max-w-md text-center space-y-4">
          <h1 className="font-serif text-display-md font-light text-text-primary">This invite has expired.</h1>
          <p className="text-body text-text-muted">Ask {(partner.user.name ?? "your friend").split(" ")[0]} to send a new one.</p>
        </div>
      </div>
    );
  }

  if (differenceInDays(new Date(), partner.invitedAt) > INVITE_EXPIRY_DAYS) {
    await prisma.accountabilityPartner.update({
      where: { id: partner.id },
      data: { status: "ENDED", endedAt: new Date() },
    });
    return (
      <div className="min-h-screen bg-bg-base flex items-center justify-center px-6">
        <div className="max-w-md text-center space-y-4">
          <h1 className="font-serif text-display-md font-light text-text-primary">This invite has expired.</h1>
          <p className="text-body text-text-muted">Ask them to send a new one.</p>
        </div>
      </div>
    );
  }

  // Try to link to a Vita user with the same email if signed-in or if their
  // account exists. Either way confirm only after they hit the button.
  const session = await getSession();
  const userFirstName = (partner.user.name ?? partner.user.email.split("@")[0]).split(" ")[0];

  return (
    <div className="min-h-screen bg-bg-base flex items-center justify-center px-6">
      <div className="max-w-md w-full space-y-8">
        <div className="space-y-3 text-center">
          <h1 className="font-serif text-display-xl font-light text-text-primary leading-tight">
            You&apos;re {userFirstName}&apos;s pick.
          </h1>
          <p className="text-body-lg text-text-secondary">
            One quiet email a week, every Sunday morning. Workouts done, habits stuck with, streak alive
            or not. No app, no daily pings, no public anything.
          </p>
        </div>

        <form action={`/api/partner/accept/${token}`} method="POST" className="space-y-2">
          <button
            type="submit"
            className="w-full py-3 rounded bg-champagne text-champagne-fg text-body font-medium hover:bg-champagne-soft transition-colors"
          >
            I&apos;m in
          </button>
          {!session && (
            <p className="text-caption text-text-disabled text-center">
              No account needed. We just register your email so we can send you the weekly note.
            </p>
          )}
        </form>

        <form action={`/api/partner/decline/${token}`} method="POST" className="text-center">
          <button
            type="submit"
            className="text-caption text-text-muted underline underline-offset-2 hover:text-text-secondary"
          >
            No, thanks
          </button>
        </form>

        <p className="text-caption text-text-disabled text-center">— Vita on behalf of {userFirstName}</p>
      </div>
    </div>
  );
  // Suppress unused warning for redirect
  void redirect;
}
