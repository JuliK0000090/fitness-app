import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import { createSession, COOKIE } from "@/lib/auth";
import { z } from "zod";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  rememberMe: z.boolean().optional().default(false),
  totpCode: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = schema.parse(await req.json());

    const user = await prisma.user.findUnique({
      where: { email: body.email },
      include: { mfaConfigs: true },
    });

    if (!user || !user.passwordHash) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const valid = await verifyPassword(user.passwordHash, body.password);
    if (!valid) return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });

    // Check TOTP if configured
    const totpConfig = user.mfaConfigs.find((m: { type: string; verified: boolean }) => m.type === "totp" && m.verified);
    if (totpConfig) {
      if (!body.totpCode) return NextResponse.json({ error: "mfa_required" }, { status: 403 });
      const { TOTP } = await import("otplib");
      const t = new TOTP();
      const valid = await t.verify(body.totpCode as string, { secret: totpConfig.secret });
      if (!valid) return NextResponse.json({ error: "Invalid MFA code" }, { status: 401 });
    }

    const token = await createSession(user.id, body.rememberMe);
    const expiryDays = body.rememberMe ? (Number(process.env.SESSION_EXPIRY_DAYS) || 30) : 1;

    const res = NextResponse.json({ ok: true, userId: user.id });
    res.cookies.set(COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: expiryDays * 24 * 60 * 60,
    });
    return res;
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: e.issues[0]?.message ?? "Validation error" }, { status: 400 });
    console.error(e);
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
