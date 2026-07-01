import { NextResponse, type NextRequest } from 'next/server';
import createIntlMiddleware from 'next-intl/middleware';

import {
  CANVAS_CLIENT_ID_COOKIE,
  isValidCanvasClientId,
} from '@/lib/canvas-client-id';
import { routing } from '@/i18n/routing';

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;
const intlMiddleware = createIntlMiddleware(routing);

function isCanvasPath(pathname: string) {
  return (
    pathname === '/canvas' ||
    pathname.startsWith('/canvas/') ||
    pathname === '/zh/canvas' ||
    pathname.startsWith('/zh/canvas/') ||
    pathname === '/api/canvas' ||
    pathname.startsWith('/api/canvas/')
  );
}

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const response = pathname.startsWith('/api/')
    ? NextResponse.next()
    : intlMiddleware(request);

  if (!isCanvasPath(pathname)) {
    return response;
  }

  const existingClientId = request.cookies.get(CANVAS_CLIENT_ID_COOKIE)?.value;

  if (!isValidCanvasClientId(existingClientId)) {
    response.cookies.set(CANVAS_CLIENT_ID_COOKIE, crypto.randomUUID(), {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: ONE_YEAR_SECONDS,
    });
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next|.*\\..*).*)',
  ],
};
