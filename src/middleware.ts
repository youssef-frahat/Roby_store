import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifySessionToken, ADMIN_COOKIE_NAME } from './utils/adminAuth';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Intercept all /admin routes
  if (pathname.startsWith('/admin')) {
    const sessionCookie = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
    const { valid } = await verifySessionToken(sessionCookie);

    // Visiting /admin/login
    if (pathname === '/admin/login') {
      if (valid) {
        // Already authenticated -> redirect directly to admin overview
        return NextResponse.redirect(new URL('/admin', request.url));
      }
      return NextResponse.next();
    }

    // Visiting protected admin routes (/admin, /admin/products, /admin/settings, etc.)
    if (!valid) {
      const loginUrl = new URL('/admin/login', request.url);
      if (pathname !== '/admin') {
        loginUrl.searchParams.set('redirect', pathname);
      }
      const response = NextResponse.redirect(loginUrl);
      if (sessionCookie) {
        // Clear invalid or expired session cookie
        response.cookies.delete(ADMIN_COOKIE_NAME);
      }
      return response;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin', '/admin/:path*'],
};
