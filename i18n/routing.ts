import { defineRouting } from 'next-intl/routing';

import { defaultLocale, locales } from '@/config/locale';

export const routing = defineRouting({
  locales,
  defaultLocale,
  localePrefix: 'as-needed',
  localeDetection: false,
});
