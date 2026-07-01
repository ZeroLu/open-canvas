import { NextResponse, type NextRequest } from 'next/server';

import {
  CANVAS_CLIENT_ID_COOKIE,
  isValidCanvasClientId,
} from '@/lib/canvas-client-id';

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

export function middleware(request: NextRequest) {
  const response = NextResponse.next();
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
  matcher: ['/canvas/:path*', '/api/canvas/:path*'],
};
