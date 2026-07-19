// ============================================================
//  middleware.ts — Gate /admin/* routes on cookie presence.
//
//  This is a PRESENCE check only — it does not verify the JWT
//  signature or expiry, it just avoids serving the admin shell to
//  a browser that clearly has no session. The real enforcement is
//  the backend (which validates the JWT on every request) and the
//  client-side AdminAuthGuard (which calls GET /api/auth/me and
//  redirects on 401, also catching expired/invalid tokens that
//  still have a cookie present).
// ============================================================

import { NextResponse, type NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === '/admin/login') {
    return NextResponse.next();
  }

  const hasAccessToken = request.cookies.has('access_token');

  if (!hasAccessToken) {
    const loginUrl = new URL('/admin/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
