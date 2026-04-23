import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { prisma } from "./prisma";

if (!process.env.JWT_SECRET) {
  console.warn("[auth] JWT_SECRET not set — using insecure default. Set JWT_SECRET in production.");
}
const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? "change-me-please-use-a-real-secret-key-32chars"
);
const COOKIE = process.env.SESSION_COOKIE_NAME ?? "vita_session";

export interface SessionPayload {
  sessionId: string;
  userId: string;
}

export async function createSession(
  userId: string,
  rememberMe = false
): Promise<string> {
  const expiryDays = rememberMe ? Math.min(90, Math.max(1, Number(process.env.SESSION_EXPIRY_DAYS) || 30)) : 1;
  const expires = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000);

  const session = await prisma.session.create({
    data: {
      userId,
      sessionToken: crypto.randomUUID(),
      expires,
      rememberMe,
    },
  });

  const token = await new SignJWT({ sessionId: session.id, userId })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(expires)
    .sign(SECRET);

  return token;
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    const session = await prisma.session.findUnique({
      where: { id: payload.sessionId as string },
    });
    if (!session || session.expires < new Date()) return null;
    return { sessionId: session.id, userId: session.userId };
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE)?.value;
  if (!token) return null;
  return verifySession(token);
}

export async function requireSession(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");
  return session;
}

export async function deleteSession(sessionId: string) {
  await prisma.session.delete({ where: { id: sessionId } }).catch(() => {});
}

export { COOKIE };
