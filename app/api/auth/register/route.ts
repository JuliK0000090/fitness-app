import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, validatePasswordStrength } from "@/lib/password";
import { createSession, COOKIE } from "@/lib/auth";
import { sendVerificationEmail } from "@/lib/email";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  dob: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  password: z.string().min(8),
});

export async function POST(req: NextRequest) {
  try {
    const body = schema.parse(await req.json());

    const strengthError = validatePasswordStrength(body.password);
    if (strengthError) return NextResponse.json({ error: strengthError }, { status: 400 });

    const existing = await prisma.user.findUnique({ where: { email: body.email } });
    if (existing) return NextResponse.json({ error: "Email already registered" }, { status: 409 });

    const passwordHash = await hashPassword(body.password);
    const emailVerifyToken = crypto.randomUUID();

    const user = await prisma.user.create({
      data: {
        email: body.email,
        name: body.name,
        dob: new Date(body.dob),
        passwordHash,
        emailVerifyToken,
        accounts: {
          create: { provider: "email", providerAccountId: body.email },
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

    await sendVerificationEmail(body.email, emailVerifyToken).catch(console.error);

    const token = await createSession(user.id);
    const res = NextResponse.json({ ok: true, userId: user.id });
    res.cookies.set(COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 24 * 60 * 60,
    });
    return res;
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: e.issues[0]?.message ?? "Validation error" }, { status: 400 });
    console.error(e);
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}
