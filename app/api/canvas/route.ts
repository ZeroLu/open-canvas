import { respData, respErr } from '@/shared/lib/resp';
import {
  createLocalCanvasDocument,
  listLocalCanvasDocuments,
} from '@/shared/models/local-canvas-store';

export async function GET() {
  try {
    const items = await listLocalCanvasDocuments();
    return respData({ items });
  } catch (error) {
    return respErr(
      error instanceof Error ? error.message : 'list canvases failed'
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as { title?: string };
    const canvas = await createLocalCanvasDocument(body.title);
    return respData({ canvas });
  } catch (error) {
    return respErr(
      error instanceof Error ? error.message : 'create canvas failed'
    );
  }
}
