import { NextResponse } from 'next/server';

import {
  normalizeProviderSettings,
  providerSettingsToErrorMap,
  validateProviderSettings,
} from '@/lib/provider-settings';
import { readProviderSettingsFromCookie, writeProviderSettingsCookie } from '@/lib/provider-settings-cookie';

export async function GET() {
  const settings = await readProviderSettingsFromCookie();
  return NextResponse.json({
    ok: true,
    settings,
  });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const settings = normalizeProviderSettings(body);
    const validation = validateProviderSettings(settings);

    if (!validation.success) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Invalid provider settings',
          fieldErrors: providerSettingsToErrorMap(settings),
        },
        { status: 400 }
      );
    }

    await writeProviderSettingsCookie(settings);

    return NextResponse.json({
      ok: true,
      settings,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error ? error.message : 'Failed to save provider settings',
      },
      { status: 400 }
    );
  }
}
