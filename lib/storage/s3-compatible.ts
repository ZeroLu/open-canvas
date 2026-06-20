import { AwsClient } from 'aws4fetch';

import type {
  StorageDownloadUploadOptions,
  StorageProvider,
  StorageUploadOptions,
  StorageUploadResult,
} from './core';

export interface S3CompatibleStorageConfig {
  endpoint: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  publicDomain?: string;
  pathPrefix?: string;
}

function normalizePathPrefix(pathPrefix?: string) {
  const value = String(pathPrefix || '').trim().replace(/^\/+|\/+$/g, '');
  return value;
}

function joinPath(...parts: string[]) {
  return parts.filter(Boolean).join('/');
}

export class S3CompatibleStorageProvider implements StorageProvider {
  readonly name = 's3-compatible';
  private readonly client: AwsClient;
  private readonly config: S3CompatibleStorageConfig;

  constructor(config: S3CompatibleStorageConfig) {
    this.config = config;
    this.client = new AwsClient({
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
      region: config.region,
    });
  }

  private getBucket(bucket?: string) {
    return bucket || this.config.bucket;
  }

  private getBaseEndpoint() {
    return this.config.endpoint.replace(/\/+$/, '');
  }

  private buildObjectKey(key: string) {
    const normalizedKey = key.replace(/^\/+/, '');
    const pathPrefix = normalizePathPrefix(this.config.pathPrefix);
    return joinPath(pathPrefix, normalizedKey);
  }

  private buildObjectUrl({
    key,
    bucket,
  }: {
    key: string;
    bucket?: string;
  }) {
    const resolvedBucket = this.getBucket(bucket);
    return `${this.getBaseEndpoint()}/${resolvedBucket}/${this.buildObjectKey(key)}`;
  }

  getPublicUrl = (options: { key: string; bucket?: string }) => {
    const objectKey = this.buildObjectKey(options.key);
    const normalizedPublicDomain = String(this.config.publicDomain || '')
      .trim()
      .replace(/\/+$/, '');

    if (normalizedPublicDomain) {
      return `${normalizedPublicDomain}/${objectKey}`;
    }

    return this.buildObjectUrl(options);
  };

  exists = async (options: { key: string; bucket?: string }) => {
    try {
      const response = await this.client.fetch(
        new Request(this.buildObjectUrl(options), {
          method: 'HEAD',
        })
      );

      return response.ok;
    } catch {
      return false;
    }
  };

  async uploadFile(
    options: StorageUploadOptions
  ): Promise<StorageUploadResult> {
    try {
      const resolvedBucket = this.getBucket(options.bucket);
      if (!resolvedBucket) {
        return {
          success: false,
          provider: this.name,
          error: 'Bucket is required',
        };
      }

      const bodyArray =
        options.body instanceof Buffer
          ? new Uint8Array(options.body)
          : options.body;

      const location = this.buildObjectUrl({
        key: options.key,
        bucket: resolvedBucket,
      });

      const response = await this.client.fetch(
        new Request(location, {
          method: 'PUT',
          headers: {
            'Content-Type': options.contentType || 'application/octet-stream',
            'Content-Disposition': options.disposition || 'inline',
            'Content-Length': String(bodyArray.length),
          },
          body: bodyArray as BodyInit,
        })
      );

      if (!response.ok) {
        return {
          success: false,
          provider: this.name,
          error: `Upload failed: ${response.status} ${response.statusText}`,
        };
      }

      return {
        success: true,
        provider: this.name,
        location,
        bucket: resolvedBucket,
        key: options.key,
        filename: options.key.split('/').pop(),
        url: this.getPublicUrl({ key: options.key, bucket: resolvedBucket }),
      };
    } catch (error) {
      return {
        success: false,
        provider: this.name,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async downloadAndUpload(
    options: StorageDownloadUploadOptions
  ): Promise<StorageUploadResult> {
    try {
      const response = await fetch(options.url);
      if (!response.ok) {
        return {
          success: false,
          provider: this.name,
          error: `HTTP error: ${response.status}`,
        };
      }

      const arrayBuffer = await response.arrayBuffer();
      return this.uploadFile({
        body: new Uint8Array(arrayBuffer),
        key: options.key,
        bucket: options.bucket,
        contentType: options.contentType,
        disposition: options.disposition,
      });
    } catch (error) {
      return {
        success: false,
        provider: this.name,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}
