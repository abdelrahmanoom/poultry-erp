import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. ملفات ثابتة + API
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/static') ||
    pathname === '/favicon.ico' ||
    /\.(ico|png|jpg|jpeg|svg|gif|webp|css|js|woff2?)$/.test(pathname)
  ) return NextResponse.next();

  // 2. Master
  if (pathname === '/master' || pathname.startsWith('/master/')) return NextResponse.next();

  // 3. الصفحة الجذرية
  if (pathname === '/') {
    const slug = request.cookies.get('tenant_slug')?.value;
    return NextResponse.redirect(
      new URL(slug ? '/' + slug + '/dashboard' : '/login', request.url)
    );
  }

  // 4. /login العام
  if (pathname === '/login') return NextResponse.next();

  // 5. /[slug]/login — يمر بلا تغيير
  if (/^\/[a-z0-9-]+\/login$/.test(pathname)) return NextResponse.next();

  // 6. مسار فيه slug بالفعل → مرّر
  if (/^\/[a-z0-9-]+\/.+$/.test(pathname)) return NextResponse.next();

  // 7. مسار بدون slug → **redirect** حسب cookie (URL يتغير)
  const slug = request.cookies.get('tenant_slug')?.value;
  if (!slug) return NextResponse.redirect(new URL('/login', request.url));

  // /sales → /[slug]/sales (URL يتغير في المتصفح)
  return NextResponse.redirect(new URL('/' + slug + pathname, request.url));
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
