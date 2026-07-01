import type { Metadata } from 'next';
import { getLocale, getMessages } from 'next-intl/server';
import { NextIntlClientProvider } from 'next-intl';
import { Toaster } from 'sonner';

import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://open-canvas.cyberbara.com'),
  title: {
    default: 'Open Canvas - Open-Source BYOK AI Workflow Canvas',
    template: '%s | Open Canvas',
  },
  description:
    'Build AI workflows with your own OpenRouter, Replicate, or Cyberbara keys. Open Canvas is free, open source, self-hostable, and includes hosted canvas storage.',
  keywords: [
    'Open Canvas',
    'AI workflow canvas',
    'BYOK AI app',
    'open source AI workflow builder',
    'OpenRouter canvas',
    'Replicate workflow',
    'Cyberbara canvas',
  ],
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'Open Canvas - Open-Source BYOK AI Workflow Canvas',
    description:
      'Create portable AI workflows with your own provider keys and free hosted canvas storage.',
    url: 'https://open-canvas.cyberbara.com',
    siteName: 'Open Canvas',
    images: [
      {
        url: '/readme/open-canvas-hero.png',
        width: 1200,
        height: 630,
        alt: 'Open Canvas AI workflow builder',
      },
    ],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Open Canvas - Open-Source BYOK AI Workflow Canvas',
    description:
      'Build AI workflows with your own provider keys and free hosted canvas storage.',
    images: ['/readme/open-canvas-hero.png'],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <body>
        <NextIntlClientProvider messages={messages}>
          {children}
          <Toaster richColors position="bottom-right" />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
