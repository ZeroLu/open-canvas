import { getRequestConfig } from 'next-intl/server';

import { defaultLocale, isAppLocale, resolveAppLocale } from '@/config/locale';

export default getRequestConfig(async ({ requestLocale }) => {
  const requestedLocale = await requestLocale;
  const locale = isAppLocale(requestedLocale)
    ? resolveAppLocale(requestedLocale)
    : defaultLocale;

  return {
    locale,
    messages: {
      pages: {
        canvas: (
          await import(`@/config/locale/messages/${locale}/pages/canvas.json`)
        ).default,
      },
      landing: (
        await import(`@/config/locale/messages/${locale}/landing.json`)
      ).default,
      providerSettings: (
        await import(
          `@/config/locale/messages/${locale}/provider-settings.json`
        )
      ).default,
    },
  };
});
