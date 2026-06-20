export type WorkflowNodeType = 'note' | 'text' | 'image' | 'video';

export type WorkflowNodeStatus = 'idle' | 'running' | 'success' | 'error';

export type ProviderKind = 'openrouter' | 'replicate';
export type StorageProviderKind = 'disabled' | 's3-compatible';

export interface WorkflowNodeData extends Record<string, unknown> {
  title: string;
  kind: WorkflowNodeType;
  provider: ProviderKind;
  model: string;
  prompt: string;
  note: string;
  inputJson: string;
  status: WorkflowNodeStatus;
  error: string | null;
  outputText: string;
  outputMediaUrl: string;
  predictionId: string | null;
  updatedAt: string | null;
}

export interface ProviderSettings {
  openrouterApiKey: string;
  openrouterBaseUrl: string;
  replicateApiToken: string;
  storageProvider: StorageProviderKind;
  storageS3Endpoint: string;
  storageS3Region: string;
  storageS3AccessKeyId: string;
  storageS3SecretAccessKey: string;
  storageS3Bucket: string;
  storageS3PublicDomain: string;
  storageS3PathPrefix: string;
}

export interface StoredCanvasState {
  version: 1;
  nodes: Array<{
    id: string;
    position: { x: number; y: number };
    data: WorkflowNodeData;
  }>;
  edges: Array<{
    id: string;
    source: string;
    target: string;
  }>;
  viewport: { x: number; y: number; zoom: number };
  settings: ProviderSettings;
}
