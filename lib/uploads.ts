import { createHash } from 'node:crypto';

import { uploadCyberbaraMedia } from '@/lib/cyberbara';
import {
  normalizeProviderSettings,
  validateProviderSettings,
} from '@/lib/provider-settings';
import { getStorageManagerFromSettings } from '@/lib/storage';

export interface UploadedMediaPayload {
  url: string;
  key: string;
  contentType: string;
  size: number;
  deduped: boolean;
}

const IMAGE_MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/svg+xml': 'svg',
  'image/avif': 'avif',
  'image/heic': 'heic',
  'image/heif': 'heif',
};

const VIDEO_MIME_TO_EXT: Record<string, string> = {
  'video/mp4': 'mp4',
  'video/quicktime': 'mov',
  'video/webm': 'webm',
};

function normalizeExtFromFilename(filename: string) {
  const ext = String(filename || '')
    .split('.')
    .pop()
    ?.trim()
    .toLowerCase();

  if (!ext || !/^[a-z0-9]{1,10}$/.test(ext)) {
    return 'bin';
  }

  return ext;
}

function toFiles(formData: FormData): File[] {
  const files = formData.getAll('files');
  const singleFile = formData.get('file');

  return [...files, ...(singleFile ? [singleFile] : [])].filter(
    (item): item is File => item instanceof File
  );
}

function getDigest(body: Uint8Array) {
  return createHash('md5').update(body).digest('hex');
}

export async function uploadCanvasMedia({
  request,
  mediaType,
  maxSizeBytes,
}: {
  request: Request;
  mediaType: 'image' | 'video';
  maxSizeBytes: number;
}): Promise<UploadedMediaPayload> {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    throw new Error('Invalid multipart form-data body');
  }

  const settings = normalizeProviderSettings({
    cyberbaraApiKey: String(formData.get('cyberbaraApiKey') || ''),
    cyberbaraBaseUrl: String(formData.get('cyberbaraBaseUrl') || ''),
    storageProvider: String(formData.get('storageProvider') || '') as
      | 'disabled'
      | 's3-compatible'
      | 'cyberbara',
    storageS3Endpoint: String(formData.get('storageS3Endpoint') || ''),
    storageS3Region: String(formData.get('storageS3Region') || ''),
    storageS3AccessKeyId: String(formData.get('storageS3AccessKeyId') || ''),
    storageS3SecretAccessKey: String(
      formData.get('storageS3SecretAccessKey') || ''
    ),
    storageS3Bucket: String(formData.get('storageS3Bucket') || ''),
    storageS3PublicDomain: String(formData.get('storageS3PublicDomain') || ''),
    storageS3PathPrefix: String(formData.get('storageS3PathPrefix') || ''),
  });

  const validation = validateProviderSettings(settings);
  if (!validation.success) {
    const storageIssue = validation.error.issues.find(
      (issue) =>
        typeof issue.path[0] === 'string' &&
        ['storage', 'cyberbara'].some((prefix) =>
          String(issue.path[0]).startsWith(prefix)
        )
    );
    if (storageIssue) {
      throw new Error(storageIssue.message);
    }
  }

  const [file] = toFiles(formData);
  if (!file) {
    throw new Error(`${mediaType} file is required`);
  }

  const contentType = String(file.type || '')
    .trim()
    .toLowerCase();
  const extMap = mediaType === 'image' ? IMAGE_MIME_TO_EXT : VIDEO_MIME_TO_EXT;
  const ext = extMap[contentType] || normalizeExtFromFilename(file.name);

  if (!Object.prototype.hasOwnProperty.call(extMap, contentType)) {
    throw new Error(`Unsupported ${mediaType} type`);
  }

  if (file.size <= 0) {
    throw new Error(`${mediaType} file is empty`);
  }

  if (file.size > maxSizeBytes) {
    throw new Error(`${mediaType} file exceeds ${maxSizeBytes} bytes`);
  }

  if (settings.storageProvider === 'cyberbara') {
    const result = await uploadCyberbaraMedia({
      apiKey: settings.cyberbaraApiKey,
      baseUrl: settings.cyberbaraBaseUrl,
      mediaType,
      file,
    });

    return result;
  }

  const storageManager = getStorageManagerFromSettings(settings);
  if (!storageManager.hasProviders()) {
    throw new Error(
      'Storage provider is not configured. Save provider settings with a valid storage config first.'
    );
  }

  const body = new Uint8Array(await file.arrayBuffer());
  const digest = getDigest(body);
  const key = `canvas/uploads/${mediaType}s/${digest}.${ext}`;

  const exists = await storageManager.exists({ key });
  if (exists) {
    const publicUrl = storageManager.getPublicUrl({ key });
    if (!publicUrl) {
      throw new Error('Stored object exists but has no public URL');
    }

    return {
      url: publicUrl,
      key,
      contentType,
      size: file.size,
      deduped: true,
    };
  }

  const result = await storageManager.uploadFile({
    body,
    key,
    contentType,
    disposition: 'inline',
  });

  if (!result.success || !result.url || !result.key) {
    throw new Error(result.error || `${mediaType} upload failed`);
  }

  return {
    url: result.url,
    key: result.key,
    contentType,
    size: file.size,
    deduped: false,
  };
}
