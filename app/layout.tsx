import type { Metadata } from 'next';

import './globals.css';

export const metadata: Metadata = {
  title: 'Open Canvas',
  description:
    'A local-first open workflow canvas for OpenRouter and Replicate powered creative pipelines.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
