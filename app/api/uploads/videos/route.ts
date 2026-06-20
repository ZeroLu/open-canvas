import { NextResponse } from 'next/server';

import { uploadCanvasMedia } from '@/lib/uploads';

const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    const file = await uploadCanvasMedia({
      request,
      mediaType: 'video',
      maxSizeBytes: MAX_FILE_SIZE_BYTES,
    });

    return NextResponse.json({
      ok: true,
      media: {
        url: file.url,
        key: file.key,
        contentType: file.contentType,
        size: file.size,
        deduped: file.deduped,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Video upload failed',
      },
      { status: 400 }
    );
  }
}
