import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * /welcome auth + onboarding-state guard.
 *
 * - Unauthenticated users go to /auth/login
 * - Already-onboarded users go to /today (no point sending them through
 *   the welcome flow twice)
 */
export default async function WelcomeLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/auth/login?next=/welcome");

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { onboardingComplete: true },
  });
  if (user?.onboardingComplete) redirect("/today");

  return <>{children}</>;
}
