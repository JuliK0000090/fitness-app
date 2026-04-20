import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ProfileView } from "./ProfileView";

export default async function ProfilePage() {
  const session = await requireSession();
  const user = await prisma.user.findUniqueOrThrow({
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
      customInstructions: true,
      customResponseStyle: true,
      onboardingComplete: true,
      createdAt: true,
    },
  });

  return (
    <ProfileView
      user={{
        ...user,
        dob: user.dob?.toISOString() ?? undefined,
        sex: user.sex ?? undefined,
        heightCm: user.heightCm ?? undefined,
        activityLevel: user.activityLevel ?? undefined,
        goalWeightKg: user.goalWeightKg ?? undefined,
        customInstructions: user.customInstructions ?? undefined,
        customResponseStyle: user.customResponseStyle ?? undefined,
        createdAt: user.createdAt.toISOString(),
      }}
    />
  );
}
