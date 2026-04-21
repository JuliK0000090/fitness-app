import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function UnsubscribePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const record = await prisma.unsubscribeToken.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!record) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md px-4">
          <p className="text-lg mb-4">This link isn&apos;t valid or has already been used.</p>
          <Link href="/" className="text-sm underline">Go to Vita</Link>
        </div>
      </div>
    );
  }

  // Flip preference
  if (record.category) {
    await prisma.emailPreference.upsert({
      where: { userId: record.userId },
      create: { userId: record.userId, [record.category]: false },
      update: { [record.category]: false },
    });
  } else {
    // Unsubscribe from all marketing
    await prisma.emailPreference.upsert({
      where: { userId: record.userId },
      create: {
        userId: record.userId,
        dailyMorningPlan: false, tomorrowEvening: false, weeklyReview: false,
        monthlyReport: false, workoutReminders: false, measurementNudges: false,
        photoNudges: false, milestones: false, winback: false, birthday: false, onboardingSeries: false,
      },
      update: {
        dailyMorningPlan: false, tomorrowEvening: false, weeklyReview: false,
        monthlyReport: false, workoutReminders: false, measurementNudges: false,
        photoNudges: false, milestones: false, winback: false, birthday: false, onboardingSeries: false,
      },
    });
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center max-w-md px-4">
        <p className="text-lg mb-2">You&apos;re unsubscribed.</p>
        <p className="text-sm text-gray-500 mb-6">
          {record.category
            ? `You won't receive ${record.category.replace(/([A-Z])/g, " $1").toLowerCase()} emails anymore.`
            : "You won't receive any non-essential emails from Vita."}
        </p>
        <Link href="/settings/email" className="text-sm underline">Manage all email preferences</Link>
      </div>
    </div>
  );
}
