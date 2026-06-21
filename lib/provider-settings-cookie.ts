import { cookies } from 'next/headers';

import {
  normalizeProviderSettings,
  validateProviderSettings,
} from '@/lib/provider-settings';
import type { ProviderSettings } from '@/lib/types';

export const PROVIDER_SETTINGS_COOKIE = 'open_canvas_provider_settings';

function encodeBase64Url(value: string) {
  return Buffer.from(value, 'utf8').toString('base64url');
}

function decodeBase64Url(value: string) {
  return Buffer.from(value, 'base64url').toString('utf8');
}

export function serializeProviderSettingsCookie(settings: ProviderSettings) {
  return encodeBase64Url(JSON.stringify(normalizeProviderSettings(settings)));
}

export function parseProviderSettingsCookie(value: string | undefined | null) {
  if (!value) {
    return normalizeProviderSettings(null);
  }

  try {
    const parsed = JSON.parse(decodeBase64Url(value)) as Partial<ProviderSettings>;
    return normalizeProviderSettings(parsed);
  } catch {
    return normalizeProviderSettings(null);
  }
}

export async function readProviderSettingsFromCookie() {
  const cookieStore = await cookies();
  const value = cookieStore.get(PROVIDER_SETTINGS_COOKIE)?.value;
  return parseProviderSettingsCookie(value);
}

export async function writeProviderSettingsCookie(settings: ProviderSettings) {
  const cookieStore = await cookies();
  const normalized = normalizeProviderSettings(settings);
  const validation = validateProviderSettings(normalized);
  if (!validation.success) {
    throw validation.error;
  }

  cookieStore.set(PROVIDER_SETTINGS_COOKIE, serializeProviderSettingsCookie(normalized), {
    httpOnly: false,
    sameSite: 'lax',
    secure: false,
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
}
