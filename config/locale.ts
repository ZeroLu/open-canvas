export const locales = ['en', 'zh'] as const;

export type AppLocale = (typeof locales)[number];

export const defaultLocale: AppLocale = 'en';

export const localeNames: Record<AppLocale, string> = {
  en: 'English',
  zh: '简体中文',
};

export function isAppLocale(value: string | undefined | null): value is AppLocale {
  return Boolean(value && locales.includes(value as AppLocale));
}

export function resolveAppLocale(value: string | undefined | null): AppLocale {
  if (!value) {
    return defaultLocale;
  }

  const normalized = value.trim().toLowerCase().split('-')[0];
  return isAppLocale(normalized) ? normalized : defaultLocale;
}
