import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TOTP, generateSecret } from "otplib";
import QRCode from "qrcode";

const totp = new TOTP();

export async function GET() {
  const session = await requireSession();
  const user = await prisma.user.findUniqueOrThrow({ where: { id: session.userId } });

  const secret = generateSecret();
  const issuer = process.env.TOTP_ISSUER ?? "Vita Fitness";
  const otpauth = totp.toURI({ label: user.email, secret, issuer });
  const qrDataUrl = await QRCode.toDataURL(otpauth);

  await prisma.mfaConfig.upsert({
    where: { userId_type: { userId: user.id, type: "totp" } },
    create: { userId: user.id, type: "totp", secret, verified: false },
    update: { secret, verified: false },
  });

  return NextResponse.json({ secret, qrDataUrl });
}

export async function POST(req: NextRequest) {
  const session = await requireSession();
  const { code } = await req.json();

  const config = await prisma.mfaConfig.findUniqueOrThrow({
    where: { userId_type: { userId: session.userId, type: "totp" } },
  });

  const valid = await totp.verify(code, { secret: config.secret });
  if (!valid) return NextResponse.json({ error: "Invalid code" }, { status: 400 });

  await prisma.mfaConfig.update({
    where: { id: config.id },
    data: { verified: true },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const session = await requireSession();
  await prisma.mfaConfig.deleteMany({ where: { userId: session.userId, type: "totp" } });
  return NextResponse.json({ ok: true });
}
