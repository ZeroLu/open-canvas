import { cookies } from 'next/headers';

export const CANVAS_CLIENT_ID_COOKIE = 'open_canvas_client_id';

export async function readCanvasClientIdFromCookie() {
  const cookieStore = await cookies();
  const value = cookieStore.get(CANVAS_CLIENT_ID_COOKIE)?.value;
  return isValidCanvasClientId(value) ? value : null;
}

export function isValidCanvasClientId(value: string | undefined | null) {
  return Boolean(value && /^[a-zA-Z0-9_-]{16,80}$/.test(value));
}
