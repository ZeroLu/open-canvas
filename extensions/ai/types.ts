/**
 * AI Configs to use AI functions
 */
export interface AIConfigs {
  [key: string]: unknown;
}

/**
 * ai media type
 */
export enum AIMediaType {
  MUSIC = 'music',
  AUDIO = 'audio',
  IMAGE = 'image',
  VIDEO = 'video',
  TEXT = 'text',
  SPEECH = 'speech',
}

export interface AISong {
  id?: string;
  createTime?: Date;
  audioUrl: string;
  imageUrl: string;
  duration: number;
  prompt: string;
  title: string;
  tags: string;
  style: string;
  model?: string;
  artist?: string;
  album?: string;
}

export interface AIImage {
  id?: string;
  createTime?: Date;
  imageType?: string;
  imageUrl?: string;
}

export interface AIVideo {
  id?: string;
  createTime?: Date;
  videoUrl?: string;
  thumbnailUrl?: string;
  duration?: number;
}

/**
 * AI generate params
 */
export interface AIGenerateParams {
  mediaType: AIMediaType;
  prompt: string;
  model?: string;
  // custom options
  options?: unknown;
  // receive notify result
  callbackUrl?: string;
  // is return stream
  stream?: boolean;
  // is async
  async?: boolean;
}

export enum AITaskStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SUCCESS = 'success',
  FAILED = 'failed',
  CANCELED = 'canceled',
}

/**
 * AI task info
 */
export interface AITaskInfo {
  songs?: AISong[];
  images?: AIImage[];
  videos?: AIVideo[];
  status?: string; // provider task status
  errorCode?: string;
  errorMessage?: string;
  createTime?: Date;
}

/**
 * AI task result
 */
export interface AITaskResult {
  taskStatus: AITaskStatus;
  taskId: string; // provider task id
  taskInfo?: AITaskInfo;
  taskResult?: unknown; // raw result from provider
}

export interface AIFile {
  url: string;
  contentType: string;
  key: string;
  index?: number;
  type?: string;
}

/**
 * AI Provider provide AI functions
 */
export interface AIProvider {
  // provider name
  readonly name: string;

  // provider configs
  configs: AIConfigs;

  // generate content
  generate({ params }: { params: AIGenerateParams }): Promise<AITaskResult>;

  // query task
  query?({
    taskId,
    mediaType,
    model,
  }: {
    taskId: string;
    mediaType?: string;
    model?: string;
  }): Promise<AITaskResult>;
}
