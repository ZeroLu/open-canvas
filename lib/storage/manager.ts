import { StorageManager } from './core';
import { S3CompatibleStorageProvider } from './s3-compatible';
import type { ProviderSettings } from '@/lib/types';

export interface CanvasStorageEnv {
  [key: string]: string | undefined;
}

function buildStorageManager(input: {
  provider: string;
  endpoint: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  publicDomain?: string;
  pathPrefix?: string;
}) {
  const manager = new StorageManager();
  const provider = input.provider.trim().toLowerCase();

  if (provider === 's3-compatible') {
    const endpoint = input.endpoint.trim();
    const region = input.region.trim() || 'auto';
    const accessKeyId = input.accessKeyId.trim();
    const secretAccessKey = input.secretAccessKey.trim();
    const bucket = input.bucket.trim();

    if (!endpoint || !accessKeyId || !secretAccessKey || !bucket) {
      throw new Error(
        'Missing S3-compatible storage configuration. Set endpoint, access key, secret key, and bucket.'
      );
    }

    manager.addProvider(
      new S3CompatibleStorageProvider({
        endpoint,
        region,
        accessKeyId,
        secretAccessKey,
        bucket,
        publicDomain: input.publicDomain?.trim() || undefined,
        pathPrefix: input.pathPrefix?.trim() || undefined,
      }),
      true
    );
  }

  return manager;
}

export function getStorageManagerFromEnv(
  env: CanvasStorageEnv = process.env
) {
  return buildStorageManager({
    provider: String(env.STORAGE_PROVIDER || ''),
    endpoint: String(env.STORAGE_S3_ENDPOINT || ''),
    region: String(env.STORAGE_S3_REGION || ''),
    accessKeyId: String(env.STORAGE_S3_ACCESS_KEY_ID || ''),
    secretAccessKey: String(env.STORAGE_S3_SECRET_ACCESS_KEY || ''),
    bucket: String(env.STORAGE_S3_BUCKET || ''),
    publicDomain: String(env.STORAGE_S3_PUBLIC_DOMAIN || ''),
    pathPrefix: String(env.STORAGE_S3_PATH_PREFIX || ''),
  });
}

export function getStorageManagerFromSettings(settings: ProviderSettings) {
  return buildStorageManager({
    provider: settings.storageProvider,
    endpoint: settings.storageS3Endpoint,
    region: settings.storageS3Region,
    accessKeyId: settings.storageS3AccessKeyId,
    secretAccessKey: settings.storageS3SecretAccessKey,
    bucket: settings.storageS3Bucket,
    publicDomain: settings.storageS3PublicDomain,
    pathPrefix: settings.storageS3PathPrefix,
  });
}
