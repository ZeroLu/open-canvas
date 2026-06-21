import { readProviderSettingsFromCookie } from '@/lib/provider-settings-cookie';
import { respData, respErr } from '@/shared/lib/resp';
import { queryLocalCanvasNodeRun } from '@/shared/services/canvas/local-canvas-runner';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ canvasId: string; runId: string }> }
) {
  try {
    const { canvasId, runId } = await params;
    const settings = await readProviderSettingsFromCookie();
    const result = await queryLocalCanvasNodeRun({
      canvasId,
      runId,
      settings,
    });

    return respData(result);
  } catch (error) {
    return respErr(
      error instanceof Error ? error.message : 'task_query_failed'
    );
  }
}
