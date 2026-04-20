import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSession, COOKIE } from "@/lib/auth";
import { nanoid } from "nanoid";

export async function POST() {
  try {
  const id = nanoid(10);
  const email = `guest_${id}@guest.vita`;
  const name = "Guest";

  const user = await prisma.user.create({
    data: {
      email,
      name,
      onboardingComplete: true,
      accounts: {
        create: { provider: "guest", providerAccountId: email },
      },
      streaks: {
        createMany: {
          data: [
            { type: "workout" },
            { type: "checklist" },
            { type: "measurement" },
          ],
        },
      },
    },
  });

  const token = await createSession(user.id);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 24 * 60 * 60,
  });
  return res;
  } catch (e) {
    console.error("[guest] error:", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
