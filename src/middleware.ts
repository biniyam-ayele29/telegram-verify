// src/middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyToken } from "@/lib/auth/utils";
import { AUTH_COOKIE_NAME } from "@/lib/auth/config";

const ADMIN_LOGIN_PATH = "/admin/login";

// Use experimental-edge runtime for middleware
export const runtime = "experimental-edge";

export const config = {
  // Matcher to specify which paths the middleware should run on.
  // This ensures it only runs for /admin/* routes, excluding /admin/login.
  matcher: ["/admin/:path*"],
};

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Skip auth check for the login page itself
  if (pathname === ADMIN_LOGIN_PATH) {
    return NextResponse.next();
  }

  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;

  if (!token) {
    // No token, redirect to login
    return NextResponse.redirect(new URL(ADMIN_LOGIN_PATH, request.url));
  }

  try {
    const decoded = await verifyToken(token);
    if (!decoded) {
      // Token exists but is invalid (e.g., expired, malformed, wrong secret)
      // Clear the invalid cookie and redirect to login
      const response = NextResponse.redirect(new URL(ADMIN_LOGIN_PATH, request.url));
      response.cookies.set(AUTH_COOKIE_NAME, "", { path: "/", expires: new Date(0) });
      return response;
    }
    // Token is valid, proceed to the requested admin page
    return NextResponse.next();
  } catch (error) {
    console.error("Auth middleware verification error:", error);
    // An unexpected error occurred during token verification
    // Clear potentially problematic cookie and redirect to login
    const response = NextResponse.redirect(new URL(ADMIN_LOGIN_PATH, request.url));
    response.cookies.set(AUTH_COOKIE_NAME, "", { path: "/", expires: new Date(0) });
    return response;
  }
}
