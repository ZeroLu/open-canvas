import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';

import { isAppLocale, locales } from '@/config/locale';

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!isAppLocale(locale)) {
    notFound();
  }

  setRequestLocale(locale);

  return children;
}
