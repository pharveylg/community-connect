import { NextRequest, NextResponse } from "next/server";

// Next.js 16 renamed middleware.ts -> proxy.ts (same runtime, same conventions).
const protectedRoutes = ["/seeker", "/provider", "/admin"];
const authRoutes = ["/login", "/register"];

export default function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const hasSession = req.cookies.has("session");

  const isProtectedRoute = protectedRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
  const isAuthRoute = authRoutes.includes(pathname);

  if (isProtectedRoute && !hasSession) {
    return NextResponse.redirect(new URL("/login", req.nextUrl));
  }

  if (isAuthRoute && hasSession) {
    // "/" routes by actual profile state (seeker/provider/admin/onboarding)
    // instead of assuming every session belongs to a seeker.
    return NextResponse.redirect(new URL("/", req.nextUrl));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|.*\\.\\w+$).*)"],
};
