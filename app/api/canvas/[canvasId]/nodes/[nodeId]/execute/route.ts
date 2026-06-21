import { readProviderSettingsFromCookie } from '@/lib/provider-settings-cookie';
import { respData, respErr } from '@/shared/lib/resp';
import { executeLocalCanvasNode } from '@/shared/services/canvas/local-canvas-runner';

export async function POST(
  request: Request,
  {
    params,
  }: {
    params: Promise<{ canvasId: string; nodeId: string }>;
  }
) {
  try {
    const { canvasId, nodeId } = await params;
    const body = (await request.json().catch(() => ({}))) as {
      revision?: number;
      triggerType?: 'manual' | 'retry';
    };

    const revision = Number(body.revision);
    if (!Number.isInteger(revision) || revision < 1) {
      return respErr('invalid_graph');
    }

    const settings = await readProviderSettingsFromCookie();
    const result = await executeLocalCanvasNode({
      canvasId,
      nodeId,
      revision,
      triggerType: body.triggerType || 'manual',
      settings,
    });

    return respData(result);
  } catch (error) {
    return respErr(
      error instanceof Error ? error.message : 'generation_failed'
    );
  }
}
