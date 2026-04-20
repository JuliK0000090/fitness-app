import { NextResponse } from "next/server";
import { getSession, deleteSession, COOKIE } from "@/lib/auth";

export async function POST() {
  const session = await getSession();
  if (session) await deleteSession(session.sessionId);

  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE, "", { maxAge: 0, path: "/" });
  return res;
}
