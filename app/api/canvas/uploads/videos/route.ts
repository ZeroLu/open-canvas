import { uploadCanvasMedia } from '@/lib/uploads';
import { readProviderSettingsFromCookie } from '@/lib/provider-settings-cookie';
import { respData, respErr } from '@/shared/lib/resp';

const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    const settings = await readProviderSettingsFromCookie();
    const file = await uploadCanvasMedia({
      request,
      mediaType: 'video',
      maxSizeBytes: MAX_FILE_SIZE_BYTES,
      settingsOverride: settings,
    });

    let durationSec: number | null = null;
    try {
      const formData = await request.clone().formData();
      const value = Number(formData.get('durationSec'));
      durationSec = Number.isFinite(value) && value > 0 ? value : null;
    } catch {
      durationSec = null;
    }

    return respData({
      media: {
        url: file.url,
        source: 'uploaded',
        assetId: file.key,
        mimeType: file.contentType,
        size: file.size,
        durationSec,
      },
    });
  } catch (error) {
    return respErr(error instanceof Error ? error.message : '视频上传失败。');
  }
}
