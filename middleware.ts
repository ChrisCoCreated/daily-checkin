import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protect admin routes
  if (pathname.startsWith('/admin')) {
    const sessionToken = request.cookies.get('admin_session');
    const sessionSecret = process.env.ADMIN_SESSION_SECRET;
    
    if (!sessionSecret) {
      // If secret not configured, deny access
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }
    
    const isAuthenticated = sessionToken?.value === sessionSecret;
    
    // If on login page and already authenticated, redirect to admin
    if (pathname === '/admin/login' && isAuthenticated) {
      return NextResponse.redirect(new URL('/admin', request.url));
    }
    
    // If not on login page and not authenticated, redirect to login
    if (pathname !== '/admin/login' && !isAuthenticated) {
      const loginUrl = new URL('/admin/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/admin/:path*',
};

