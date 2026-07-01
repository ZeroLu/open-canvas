import type { Metadata } from 'next';

import { LandingPage } from '@/components/landing-page';
import { resolveAppLocale } from '@/config/locale';

const metadataByLocale = {
  en: {
    title: 'Open Canvas - Open-Source BYOK AI Workflow Canvas',
    description:
      'Build AI workflows with your own OpenRouter, Replicate, or Cyberbara keys. Open Canvas is free, open source, and self-hostable.',
  },
  zh: {
    title: 'Open Canvas - 开源 BYOK AI 工作流画布',
    description:
      '使用你自己的 OpenRouter、Replicate 或 Cyberbara Key 构建 AI 工作流。Open Canvas 免费、开源，并支持自托管。',
  },
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = resolveAppLocale(rawLocale);
  const metadata = metadataByLocale[locale];

  return {
    title: metadata.title,
    description: metadata.description,
    alternates: {
      canonical: locale === 'zh' ? '/zh' : '/',
      languages: {
        en: '/',
        zh: '/zh',
      },
    },
    openGraph: {
      title: metadata.title,
      description: metadata.description,
      url:
        locale === 'zh'
          ? 'https://open-canvas.cyberbara.com/zh'
          : 'https://open-canvas.cyberbara.com',
    },
    twitter: {
      title: metadata.title,
      description: metadata.description,
    },
  };
}

export default async function HomePage() {
  return <LandingPage />;
}
