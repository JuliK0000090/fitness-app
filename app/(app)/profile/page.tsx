import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ProfileView } from "./ProfileView";

export default async function ProfilePage() {
  const session = await requireSession();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user = await (prisma.user.findUniqueOrThrow as any)({
    where: { id: session.userId },
    select: {
      id: true,
      name: true,
      email: true,
      avatarUrl: true,
      dob: true,
      sex: true,
      heightCm: true,
      activityLevel: true,
      goalWeightKg: true,
      onGlp1: true,
      customInstructions: true,
      customResponseStyle: true,
      onboardingComplete: true,
      createdAt: true,
    },
  }) as {
    id: string; name: string | null; email: string; avatarUrl: string | null;
    dob: Date | null; sex: string | null; heightCm: number | null; activityLevel: string | null;
    goalWeightKg: number | null; onGlp1: boolean; customInstructions: string | null;
    customResponseStyle: string | null; onboardingComplete: boolean; createdAt: Date;
  };

  return (
    <ProfileView
      user={{
        ...user,
        dob: user.dob?.toISOString() ?? undefined,
        sex: user.sex ?? undefined,
        heightCm: user.heightCm ?? undefined,
        activityLevel: user.activityLevel ?? undefined,
        goalWeightKg: user.goalWeightKg ?? undefined,
        onGlp1: user.onGlp1,
        customInstructions: user.customInstructions ?? undefined,
        customResponseStyle: user.customResponseStyle ?? undefined,
        createdAt: user.createdAt.toISOString(),
      }}
    />
  );
}
