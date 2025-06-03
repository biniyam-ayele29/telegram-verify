
// src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth/utils'; // Adjust path as needed
import { AUTH_COOKIE_NAME } from '@/lib/auth/config'; // Adjust path as needed

const ADMIN_PATH_PREFIX = '/admin';
const ADMIN_LOGIN_PATH = '/admin/login';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // If the request is for an admin path
  if (pathname.startsWith(ADMIN_PATH_PREFIX)) {
    const tokenCookie = request.cookies.get(AUTH_COOKIE_NAME);
    const token = tokenCookie?.value;

    let isAuthenticated = false;
    if (token) {
      const decodedToken = verifyToken(token);
      if (decodedToken) {
        isAuthenticated = true;
      }
    }

    // If trying to access /admin/login and already authenticated, redirect to /admin dashboard
    if (isAuthenticated && pathname === ADMIN_LOGIN_PATH) {
      return NextResponse.redirect(new URL(ADMIN_PATH_PREFIX, request.url));
    }

    // If trying to access any other /admin/* path and not authenticated, redirect to /admin/login
    if (!isAuthenticated && pathname !== ADMIN_LOGIN_PATH) {
      return NextResponse.redirect(new URL(ADMIN_LOGIN_PATH, request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  // Matcher to specify which paths the middleware should run on.
  // This ensures it only runs for /admin/* routes.
  matcher: ['/admin/:path*'],
};
