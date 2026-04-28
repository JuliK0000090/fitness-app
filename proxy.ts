import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? "change-me-please-use-a-real-secret-key"
);

async function verifyTokenEdge(token: string): Promise<boolean> {
  try {
    await jwtVerify(token, SECRET);
    return true;
  } catch {
    return false;
  }
}

const PUBLIC_PATHS = [
  "/",
  "/auth/login",
  "/auth/register",
  "/auth/forgot-password",
  "/auth/reset-password",
  "/auth/verify-email",
  "/legal/privacy",
  "/legal/terms",
  "/api/auth/guest",
  "/api/auth/register",
  "/api/auth/login",
  "/api/auth/forgot-password",
  "/api/auth/reset-password",
  "/api/auth/verify-email",
  "/api/auth/callback",
  "/api/webhooks",
  "/api/admin",
  "/api/debug",
  "/api/unsubscribe",
  "/unsubscribe",
  "/mockups",
];

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow public paths and static files. Match the path itself, query-only
  // suffixes, AND sub-paths so that prefixes like `/api/webhooks` cover
  // every concrete endpoint underneath (e.g. `/api/webhooks/hae/{token}`,
  // `/api/webhooks/resend`, `/api/webhooks/terra`).
  if (
    PUBLIC_PATHS.some((p) =>
      pathname === p ||
      pathname.startsWith(p + "?") ||
      pathname.startsWith(p + "/")
    ) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/auth/callback") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const cookie = req.cookies.get(process.env.SESSION_COOKIE_NAME ?? "vita_session");
  if (!cookie?.value) {
    return NextResponse.redirect(new URL(`/auth/login?next=${encodeURIComponent(pathname)}`, req.url));
  }

  const valid = await verifyTokenEdge(cookie.value);
  if (!valid) {
    const res = NextResponse.redirect(new URL(`/auth/login?next=${encodeURIComponent(pathname)}`, req.url));
    res.cookies.set(process.env.SESSION_COOKIE_NAME ?? "vita_session", "", { maxAge: 0, path: "/" });
    return res;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest.json|icons/).*)"],
};
