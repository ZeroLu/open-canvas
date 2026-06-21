import { uploadCanvasMedia } from '@/lib/uploads';
import { readProviderSettingsFromCookie } from '@/lib/provider-settings-cookie';
import { respData, respErr } from '@/shared/lib/resp';

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    const settings = await readProviderSettingsFromCookie();
    const file = await uploadCanvasMedia({
      request,
      mediaType: 'image',
      maxSizeBytes: MAX_FILE_SIZE_BYTES,
      settingsOverride: settings,
    });

    return respData({
      media: {
        url: file.url,
        source: 'uploaded',
        assetId: file.key,
        mimeType: file.contentType,
        size: file.size,
      },
    });
  } catch (error) {
    return respErr(error instanceof Error ? error.message : '图片上传失败。');
  }
}
