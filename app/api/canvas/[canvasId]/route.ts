import { respData, respErr } from '@/shared/lib/resp';
import {
  deleteLocalCanvasDocument,
  findLocalCanvasDocumentById,
  renameLocalCanvasDocument,
  touchLocalCanvasDocumentOpenedAt,
} from '@/shared/models/local-canvas-store';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ canvasId: string }> }
) {
  const { canvasId } = await params;
  const canvas = await findLocalCanvasDocumentById(canvasId);
  if (!canvas) {
    return respErr('canvas not found');
  }

  await touchLocalCanvasDocumentOpenedAt(canvasId);
  return respData({ canvas });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ canvasId: string }> }
) {
  const { canvasId } = await params;
  const body = (await request.json().catch(() => ({}))) as { title?: string };
  const title = String(body.title || '').trim();

  if (!title) {
    return respErr('canvas title is required');
  }

  const canvas = await renameLocalCanvasDocument(canvasId, title);
  if (!canvas) {
    return respErr('canvas not found');
  }

  return respData({ canvas });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ canvasId: string }> }
) {
  const { canvasId } = await params;
  const deleted = await deleteLocalCanvasDocument(canvasId);
  if (!deleted) {
    return respErr('canvas not found');
  }

  return respData({
    id: canvasId,
    deleted: true,
    status: 'archived',
  });
}
