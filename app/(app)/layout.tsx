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

  if (!user.onboardingComplete) redirect("/welcome");

  // Admin email check — gates the admin links in the avatar dropdown.
  const adminEmails = (process.env.ADMIN_EMAILS ?? "juliana.kolarski@gmail.com")
    .split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  const isAdmin = adminEmails.includes(user.email.toLowerCase());

  return (
    <AppShell user={{ ...user, isAdmin }}>
      <PageTransition>{children}</PageTransition>
    </AppShell>
  );
}
