import { notFound } from 'next/navigation';

import { OpenCanvasShell } from '@/components/open-canvas-shell';
import { findLocalCanvasDocumentById } from '@/shared/models/local-canvas-store';

export default async function CanvasPage({
  params,
}: {
  params: Promise<{ canvasId: string }>;
}) {
  const { canvasId } = await params;
  const canvas = await findLocalCanvasDocumentById(canvasId);

  if (!canvas) {
    notFound();
  }

  return <OpenCanvasShell initialCanvas={canvas} />;
}
