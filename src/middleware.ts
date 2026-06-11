import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const SESSION_COOKIE = 'wc26_session';

export async function middleware(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const loginUrl = new URL('/login', req.url);

  if (!token) return NextResponse.redirect(loginUrl);

  try {
    await jwtVerify(token, new TextEncoder().encode(process.env.AUTH_SECRET ?? ''));
    return NextResponse.next();
  } catch {
    return NextResponse.redirect(loginUrl);
  }
}

export const config = {
  matcher: ['/matches/:path*', '/leaderboard/:path*', '/users/:path*'],
};
