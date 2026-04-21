import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendVerificationEmail } from "@/lib/email";

// Simple admin secret guard — set ADMIN_SECRET in Railway Variables
function isAuthorized(req: NextRequest) {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) return false;
  return req.headers.get("x-admin-secret") === secret;
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Find all real users with unverified emails (exclude guests)
  const users = await prisma.user.findMany({
    where: {
      emailVerified: null,
      emailVerifyToken: { not: null },
      email: { not: { endsWith: "@guest.vita" } },
    },
    select: { id: true, email: true, name: true, emailVerifyToken: true },
  });

  const results: { email: string; status: string }[] = [];

  for (const user of users) {
    try {
      await sendVerificationEmail(user.email, user.emailVerifyToken!);
      results.push({ email: user.email, status: "sent" });
    } catch (e) {
      results.push({ email: user.email, status: `failed: ${e instanceof Error ? e.message : String(e)}` });
    }
  }

  return NextResponse.json({ total: users.length, results });
}
