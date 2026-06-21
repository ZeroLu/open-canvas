import { parseCanvasGraphPayload } from '@/shared/lib/canvas/validation';
import { respData, respErr, respJson } from '@/shared/lib/resp';
import {
  updateLocalCanvasDocumentGraph,
} from '@/shared/models/local-canvas-store';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ canvasId: string }> }
) {
  const { canvasId } = await params;
  const body = (await request.json().catch(() => ({}))) as {
    revision?: number;
    graph?: unknown;
  };

  const revision = Number(body.revision);
  if (!Number.isInteger(revision) || revision < 1) {
    return respErr('invalid_graph');
  }

  const parsedGraph = parseCanvasGraphPayload(body.graph);
  if (!parsedGraph.ok) {
    return respErr(parsedGraph.code);
  }

  const result = await updateLocalCanvasDocumentGraph({
    id: canvasId,
    revision,
    graph: parsedGraph.graph,
  });

  if (!result) {
    return respErr('canvas_not_found');
  }

  if (!result.ok) {
    return respJson(-1, 'revision_conflict', {
      revision: result.canvas.revision,
      updatedAt: result.canvas.updatedAt,
    });
  }

  return respData({
    revision: result.canvas.revision,
    updatedAt: result.canvas.updatedAt,
  });
}
