export function getMediaDisplayUrl(url: string | null | undefined) {
  const normalizedUrl = String(url || '').trim();
  if (!normalizedUrl) {
    return '';
  }

  if (/^https?:\/\//i.test(normalizedUrl)) {
    return `/api/media/proxy?url=${encodeURIComponent(normalizedUrl)}`;
  }

  return normalizedUrl;
}
