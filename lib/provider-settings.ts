import { z } from 'zod';

import type { ProviderSettings } from '@/lib/types';

export const DEFAULT_PROVIDER_SETTINGS: ProviderSettings = {
  openrouterApiKey: '',
  openrouterBaseUrl: 'https://openrouter.ai/api/v1',
  replicateApiToken: '',
  storageProvider: 'disabled',
  storageS3Endpoint: '',
  storageS3Region: 'auto',
  storageS3AccessKeyId: '',
  storageS3SecretAccessKey: '',
  storageS3Bucket: '',
  storageS3PublicDomain: '',
  storageS3PathPrefix: 'uploads',
};

const baseSchema = z.object({
  openrouterApiKey: z.string(),
  openrouterBaseUrl: z.string(),
  replicateApiToken: z.string(),
  storageProvider: z.enum(['disabled', 's3-compatible']),
  storageS3Endpoint: z.string(),
  storageS3Region: z.string(),
  storageS3AccessKeyId: z.string(),
  storageS3SecretAccessKey: z.string(),
  storageS3Bucket: z.string(),
  storageS3PublicDomain: z.string(),
  storageS3PathPrefix: z.string(),
});

export const providerSettingsSchema = baseSchema.superRefine((value, ctx) => {
  if (
    value.openrouterBaseUrl.trim() &&
    !z.url().safeParse(value.openrouterBaseUrl.trim()).success
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['openrouterBaseUrl'],
      message: 'OpenRouter base URL must be a valid URL.',
    });
  }

  if (
    value.storageProvider === 's3-compatible' &&
    !value.storageS3Endpoint.trim()
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['storageS3Endpoint'],
      message: 'S3 endpoint is required.',
    });
  }

  if (
    value.storageProvider === 's3-compatible' &&
    value.storageS3Endpoint.trim() &&
    !z.url().safeParse(value.storageS3Endpoint.trim()).success
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['storageS3Endpoint'],
      message: 'S3 endpoint must be a valid URL.',
    });
  }

  if (
    value.storageProvider === 's3-compatible' &&
    !value.storageS3AccessKeyId.trim()
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['storageS3AccessKeyId'],
      message: 'S3 access key is required.',
    });
  }

  if (
    value.storageProvider === 's3-compatible' &&
    !value.storageS3SecretAccessKey.trim()
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['storageS3SecretAccessKey'],
      message: 'S3 secret key is required.',
    });
  }

  if (
    value.storageProvider === 's3-compatible' &&
    !value.storageS3Bucket.trim()
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['storageS3Bucket'],
      message: 'S3 bucket is required.',
    });
  }

  if (
    value.storageProvider === 's3-compatible' &&
    value.storageS3PublicDomain.trim() &&
    !z.url().safeParse(value.storageS3PublicDomain.trim()).success
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['storageS3PublicDomain'],
      message: 'Public domain must be a valid URL.',
    });
  }
});

export function normalizeProviderSettings(
  raw: Partial<ProviderSettings> | null | undefined
): ProviderSettings {
  return {
    ...DEFAULT_PROVIDER_SETTINGS,
    ...raw,
  };
}

export function validateProviderSettings(settings: ProviderSettings) {
  return providerSettingsSchema.safeParse(settings);
}

export function providerSettingsToErrorMap(settings: ProviderSettings) {
  const result = validateProviderSettings(settings);
  if (result.success) {
    return {} as Partial<Record<keyof ProviderSettings, string>>;
  }

  const next: Partial<Record<keyof ProviderSettings, string>> = {};
  for (const issue of result.error.issues) {
    const key = issue.path[0];
    if (typeof key === 'string' && !(key in next)) {
      next[key as keyof ProviderSettings] = issue.message;
    }
  }
  return next;
}
