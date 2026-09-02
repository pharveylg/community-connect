import { NextRequest, NextResponse } from "next/server";

// Next.js 16 renamed middleware.ts -> proxy.ts (same runtime, same conventions).
// NOTE: the proxy can only check cookie EXISTENCE (edge runtime has no
// Firebase Admin). Validity is checked server-side by pages/actions, and
// auth pages render for cookie-holders too — the login page redirects
// genuinely-valid sessions. This is what makes a stale/revoked cookie
// unable to cause a redirect loop.
const protectedRoutes = ["/seeker", "/provider", "/admin"];

export default function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const hasSession = req.cookies.has("session");

  const isProtectedRoute = protectedRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  if (isProtectedRoute && !hasSession) {
    return NextResponse.redirect(new URL("/login", req.nextUrl));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|.*\\.\\w+$).*)"],
};
