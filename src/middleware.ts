// src/middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyToken } from "@/lib/auth/utils"; // Adjust path as needed
import { AUTH_COOKIE_NAME } from "@/lib/auth/config"; // Adjust path as needed

const ADMIN_PATH_PREFIX = "/admin";
const ADMIN_LOGIN_PATH = "/admin/login";

// Use experimental-edge runtime for middleware
export const runtime = "experimental-edge";

export const config = {
  // Matcher to specify which paths the middleware should run on.
  // This ensures it only runs for /admin/* routes.
  matcher: ["/admin/:path*"],
};

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Skip auth check for login page
  if (pathname === ADMIN_LOGIN_PATH) {
    return NextResponse.next();
  }

  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.redirect(new URL(ADMIN_LOGIN_PATH, request.url));
  }

  try {
    const decoded = await verifyToken(token);
    if (!decoded) {
      return NextResponse.redirect(new URL(ADMIN_LOGIN_PATH, request.url));
    }
    return NextResponse.next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    return NextResponse.redirect(new URL(ADMIN_LOGIN_PATH, request.url));
  }
}
