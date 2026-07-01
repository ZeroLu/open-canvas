import { useCallback } from 'react';
import { useLocale, useTranslations } from 'next-intl';

type TranslationValues = Record<string, string | number>;

export function useCanvasTranslations() {
  const t = useTranslations('pages.canvas');

  return useCallback(
    (path: string, values?: TranslationValues) => t(path, values),
    [t]
  );
}

export function useCanvasLocale() {
  return useLocale();
}
