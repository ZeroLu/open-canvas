import { CanvasListPage } from '@/components/canvas-list-page';
import { listLocalCanvasDocuments } from '@/shared/models/local-canvas-store';

export const dynamic = 'force-dynamic';

export default async function CanvasIndexPage() {
  const canvases = await listLocalCanvasDocuments();
  return <CanvasListPage initialCanvases={canvases} />;
}
