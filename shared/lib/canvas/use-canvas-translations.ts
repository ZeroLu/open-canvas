import { useCallback } from 'react';

import messages from '@/shared/lib/canvas/messages.en.json';

type TranslationValues = Record<string, string | number>;
interface TranslationTree {
  [key: string]: string | TranslationTree;
}

function getMessage(path: string): string {
  const segments = path.split('.');
  let current: string | TranslationTree = messages as TranslationTree;

  for (const segment of segments) {
    if (!current || typeof current === 'string' || !(segment in current)) {
      return path;
    }
    current = current[segment] as string | TranslationTree;
  }

  return typeof current === 'string' ? current : path;
}

function interpolate(message: string, values?: TranslationValues) {
  if (!values) {
    return message;
  }

  return message.replace(/\{(\w+)\}/g, (_, key: string) =>
    key in values ? String(values[key]) : `{${key}}`
  );
}

export function useCanvasTranslations() {
  return useCallback(
    (path: string, values?: TranslationValues) =>
      interpolate(getMessage(path), values),
    []
  );
}

export function useCanvasLocale() {
  return 'en';
}
