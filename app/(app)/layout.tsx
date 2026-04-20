import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/app/AppShell";
import { PageTransition } from "@/components/ui/PageTransition";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/auth/login");

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: session.userId },
    select: { id: true, name: true, email: true, avatarUrl: true, onboardingComplete: true },
  });

  if (!user.onboardingComplete) redirect("/onboarding");

  return <AppShell user={user}><PageTransition>{children}</PageTransition></AppShell>;
}
