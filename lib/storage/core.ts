export interface StorageUploadOptions {
  body: Buffer | Uint8Array;
  key: string;
  contentType?: string;
  bucket?: string;
  disposition?: 'inline' | 'attachment';
}

export interface StorageDownloadUploadOptions {
  url: string;
  key: string;
  bucket?: string;
  contentType?: string;
  disposition?: 'inline' | 'attachment';
}

export interface StorageUploadResult {
  success: boolean;
  provider: string;
  location?: string;
  bucket?: string;
  key?: string;
  filename?: string;
  url?: string;
  error?: string;
}

export interface StorageProvider {
  readonly name: string;
  exists?: (options: { key: string; bucket?: string }) => Promise<boolean>;
  getPublicUrl?: (options: { key: string; bucket?: string }) => string;
  uploadFile(options: StorageUploadOptions): Promise<StorageUploadResult>;
  downloadAndUpload(
    options: StorageDownloadUploadOptions
  ): Promise<StorageUploadResult>;
}

export class StorageManager {
  private providers: StorageProvider[] = [];
  private defaultProvider?: StorageProvider;

  addProvider(provider: StorageProvider, isDefault = false) {
    this.providers.push(provider);
    if (isDefault) {
      this.defaultProvider = provider;
    }
  }

  getProvider(name: string) {
    return this.providers.find((provider) => provider.name === name);
  }

  getProviderNames() {
    return this.providers.map((provider) => provider.name);
  }

  hasProviders() {
    return this.providers.length > 0;
  }

  private requireDefaultProvider() {
    if (!this.defaultProvider && this.providers.length > 0) {
      this.defaultProvider = this.providers[0];
    }

    if (!this.defaultProvider) {
      throw new Error('No storage provider configured');
    }

    return this.defaultProvider;
  }

  async uploadFile(options: StorageUploadOptions) {
    return this.requireDefaultProvider().uploadFile(options);
  }

  async downloadAndUpload(options: StorageDownloadUploadOptions) {
    return this.requireDefaultProvider().downloadAndUpload(options);
  }

  async exists(options: { key: string; bucket?: string }) {
    const provider = this.requireDefaultProvider();
    if (!provider.exists) {
      return false;
    }
    return provider.exists(options);
  }

  getPublicUrl(options: { key: string; bucket?: string }) {
    const provider = this.requireDefaultProvider();
    if (!provider.getPublicUrl) {
      return undefined;
    }
    return provider.getPublicUrl(options);
  }
}
