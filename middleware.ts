import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. ملفات ثابتة + API + أيقونات Next.js
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/static') ||
    pathname === '/favicon.ico' ||
    pathname === '/icon' ||
    pathname === '/apple-icon' ||
    pathname === '/opengraph-image' ||
    pathname === '/twitter-image' ||
    pathname === '/manifest.json' ||
    pathname === '/robots.txt' ||
    pathname === '/sitemap.xml' ||
    /\.(ico|png|jpg|jpeg|svg|gif|webp|css|js|woff2?|ttf|otf)$/.test(pathname)
  ) return NextResponse.next();

  // 2. Master — لا يتأثر بالجلسة
  if (pathname === '/master' || pathname.startsWith('/master/')) return NextResponse.next();

  // 3. قراءة الجلسة
  const hasToken = !!request.cookies.get('tenant_token')?.value;
  const slug = request.cookies.get('tenant_slug')?.value;

  // 4. الصفحة الجذرية
  if (pathname === '/') {
    return NextResponse.redirect(
      new URL(hasToken && slug ? '/' + slug + '/dashboard' : '/login', request.url)
    );
  }

  // 5. /login — إذا مسجّل → redirect للـ dashboard
  if (pathname === '/login') {
    if (hasToken && slug) {
      return NextResponse.redirect(new URL('/' + slug + '/dashboard', request.url));
    }
    return NextResponse.next();
  }

  // 6. /[slug]/login — إذا مسجّل بنفس الـ slug → redirect
  const slugLoginMatch = pathname.match(/^\/([a-z0-9-]+)\/login$/);
  if (slugLoginMatch) {
    const urlSlug = slugLoginMatch[1];
    if (hasToken && slug === urlSlug) {
      return NextResponse.redirect(new URL('/' + urlSlug + '/dashboard', request.url));
    }
    return NextResponse.next();
  }

  // 7. مسار فيه slug بالفعل → مرّر
  if (/^\/[a-z0-9-]+\/.+$/.test(pathname)) return NextResponse.next();

  // 8. مسار بدون slug → redirect حسب cookie
  if (!slug || !hasToken) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.redirect(new URL('/' + slug + pathname, request.url));
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
