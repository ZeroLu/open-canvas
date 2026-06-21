export const dynamic = 'force-dynamic';

function getSafeMediaUrl(rawUrl: string | null) {
  if (!rawUrl) {
    throw new Error('media url is required');
  }

  const url = new URL(rawUrl);
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new Error('media url must be http or https');
  }

  return url;
}

export async function GET(request: Request) {
  try {
    const requestUrl = new URL(request.url);
    const mediaUrl = getSafeMediaUrl(requestUrl.searchParams.get('url'));
    const range = request.headers.get('range');

    const upstream = await fetch(mediaUrl, {
      headers: {
        ...(range ? { Range: range } : {}),
      },
    });

    if (!upstream.ok && upstream.status !== 206) {
      return Response.json(
        {
          code: -1,
          message: `media fetch failed with status ${upstream.status}`,
        },
        { status: upstream.status }
      );
    }

    const headers = new Headers();
    for (const key of [
      'content-type',
      'content-length',
      'content-range',
      'accept-ranges',
      'last-modified',
      'etag',
    ]) {
      const value = upstream.headers.get(key);
      if (value) {
        headers.set(key, value);
      }
    }
    headers.set('cache-control', 'public, max-age=86400');

    return new Response(upstream.body, {
      status: upstream.status,
      headers,
    });
  } catch (error) {
    return Response.json(
      {
        code: -1,
        message:
          error instanceof Error ? error.message : 'failed to proxy media',
      },
      { status: 400 }
    );
  }
}
