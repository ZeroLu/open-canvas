import type { AICreditScene } from '@/shared/lib/ai-credit-rules';
import {
  getDefaultCanvasNodeCopy,
  normalizeCanvasSoundKey,
} from '@/shared/lib/canvas/copy';
import {
  normalizeCanvasImageSettingsForModel,
  normalizeCanvasVideoSettingsForModel,
} from '@/shared/lib/canvas/model-options';

export type CanvasNodeType = 'text' | 'note' | 'image' | 'video' | 'audio';
export type CanvasNodeStatus =
  | 'idle'
  | 'queued'
  | 'running'
  | 'success'
  | 'error';
export type CanvasRunTriggerType = 'manual' | 'retry';
export type CanvasRunStatus =
  | 'pending'
  | 'running'
  | 'success'
  | 'failed'
  | 'canceled';
export type CanvasTextScene = 'text-to-text' | 'image-to-text';
export type CanvasExecutionScene = AICreditScene | CanvasTextScene;
export type CanvasMediaSource = 'generated' | 'uploaded';
export type CanvasMediaInputMode = 'generate' | 'upload';
export type CanvasImageSceneMode = 'auto' | 'text-to-image' | 'image-to-image';
export type CanvasVideoReferenceMode =
  | 'auto'
  | 'first_frame'
  | 'first_last_frames'
  | 'omni_reference';

export const DEFAULT_CANVAS_NODE_MODEL: Record<CanvasNodeType, string> = {
  text: 'gemini-3-flash',
  note: '',
  image: 'nano-banana-pro',
  video: 'seedance-2-fast-stable',
  audio: 'suno-sound-v5',
};

export interface CanvasViewport {
  x: number;
  y: number;
  zoom: number;
}

export interface CanvasNodeMedia {
  url: string;
  source: CanvasMediaSource;
  assetId?: string | null;
  mimeType?: string | null;
  thumbnailUrl?: string | null;
  durationSec?: number | null;
  size?: number | null;
}

export interface CanvasNodeBaseData extends Record<string, unknown> {
  title: string;
  subtitle: string;
  nodeType: CanvasNodeType;
  prompt: string;
  model: string;
  status: CanvasNodeStatus;
  errorMessage: string | null;
  lastRunId: string | null;
  lastCompletedAt: string | null;
  lastScene: CanvasExecutionScene | null;
  costCredits: number | null;
}

export interface CanvasTextNodeData extends CanvasNodeBaseData {
  nodeType: 'text';
  plainText: string;
}

export interface CanvasNoteNodeData extends CanvasNodeBaseData {
  nodeType: 'note';
  noteHtml: string;
}

export interface CanvasImageNodeData extends CanvasNodeBaseData {
  nodeType: 'image';
  image: CanvasNodeMedia | null;
  imageOutputs: CanvasNodeMedia[];
  selectedImageIndex: number;
  inputMode: CanvasMediaInputMode;
  sceneMode: CanvasImageSceneMode;
  aspectRatio: string;
  resolution: string;
  imageWeight: string;
  styleReferenceWeight: string;
  omniReferenceWeight: string;
}

export interface CanvasVideoNodeData extends CanvasNodeBaseData {
  nodeType: 'video';
  video: CanvasNodeMedia | null;
  videoHistory: CanvasNodeMedia[];
  selectedVideoIndex: number;
  inputMode: CanvasMediaInputMode;
  referenceMode: CanvasVideoReferenceMode;
  aspectRatio: string;
  resolution: string;
  duration: string;
}

export interface CanvasAudioNodeData extends CanvasNodeBaseData {
  nodeType: 'audio';
  audio: CanvasNodeMedia | null;
  inputMode: CanvasMediaInputMode;
  soundLoop: boolean;
  soundTempo: string;
  soundKey: string;
}

export type CanvasNodeData =
  | CanvasTextNodeData
  | CanvasNoteNodeData
  | CanvasImageNodeData
  | CanvasVideoNodeData
  | CanvasAudioNodeData;

export interface SerializedCanvasNode {
  id: string;
  type: CanvasNodeType;
  position: {
    x: number;
    y: number;
  };
  width?: number;
  height?: number;
  data?: Record<string, unknown>;
}

export interface SerializedCanvasEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  type?: string;
  data?: Record<string, unknown>;
}

export interface SerializedCanvasGraph {
  version: 1;
  viewport: CanvasViewport;
  nodes: SerializedCanvasNode[];
  edges: SerializedCanvasEdge[];
}

export interface CanvasPreviewSummary {
  nodeCount: number;
  imageCount: number;
  videoCount: number;
  audioCount: number;
  heroNodeType: Extract<CanvasNodeType, 'image' | 'video'> | null;
  heroTitle: string | null;
  heroMedia: CanvasNodeMedia | null;
  textSnippet: string | null;
}

export interface CanvasDocumentSummary {
  id: string;
  title: string;
  status: string;
  revision: number;
  preview: CanvasPreviewSummary;
  lastOpenedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface CanvasDocumentRecord extends CanvasDocumentSummary {
  graph: SerializedCanvasGraph;
}

export interface CanvasTemplateOwnerSummary {
  id: string;
  name: string;
  image: string | null;
}

export interface CanvasTemplateSummary {
  id: string;
  shareKey: string;
  sourceCanvasId: string | null;
  title: string;
  preview: CanvasPreviewSummary;
  copyCount: number;
  owner: CanvasTemplateOwnerSummary | null;
  publishedAt: string | null;
  updatedAt: string | null;
}

export interface CanvasTemplateRecord extends CanvasTemplateSummary {
  graph: SerializedCanvasGraph;
}

export interface CanvasVisitedTemplateSummary extends CanvasTemplateSummary {
  lastVisitedAt: string | null;
}

export interface CanvasNodePatch {
  nodeId: string;
  status?: CanvasNodeStatus;
  errorMessage?: string | null;
  lastRunId?: string | null;
  lastCompletedAt?: string | null;
  lastScene?: CanvasExecutionScene | null;
  costCredits?: number | null;
  plainText?: string;
  noteHtml?: string;
  image?: CanvasNodeMedia | null;
  imageOutputs?: CanvasNodeMedia[];
  selectedImageIndex?: number;
  video?: CanvasNodeMedia | null;
  videoHistory?: CanvasNodeMedia[];
  selectedVideoIndex?: number;
  audio?: CanvasNodeMedia | null;
}

export interface CanvasNodeRunRecord {
  id: string;
  canvasId: string;
  userId: string;
  nodeId: string;
  nodeType: CanvasNodeType;
  status: CanvasRunStatus;
  triggerType: CanvasRunTriggerType;
  scene: CanvasExecutionScene | null;
  provider: string | null;
  model: string | null;
  prompt: string;
  aiTaskId: string | null;
  costCredits: number;
  inputSummary: Record<string, unknown> | null;
  requestPayload: Record<string, unknown> | null;
  responsePayload: Record<string, unknown> | null;
  outputAsset: CanvasNodeMedia | null;
  errorCode: string | null;
  errorMessage: string | null;
  finishedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

function normalizeCanvasText(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function normalizeCanvasNullableText(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}

function normalizeCanvasNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function normalizeCanvasPosition(value: unknown): { x: number; y: number } {
  const position =
    value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};

  return {
    x: Number(position.x || 0),
    y: Number(position.y || 0),
  };
}

function normalizeCanvasHandle(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined;
}

function isCanvasLeftHandleId(handleId?: string | null): boolean {
  return Boolean(handleId) && handleId !== 'right';
}

function normalizeSerializedCanvasEdgeDirection(
  edge: SerializedCanvasEdge
): SerializedCanvasEdge {
  if (
    isCanvasLeftHandleId(edge.sourceHandle) &&
    !isCanvasLeftHandleId(edge.targetHandle)
  ) {
    return {
      ...edge,
      source: edge.target,
      target: edge.source,
      sourceHandle: edge.targetHandle,
      targetHandle: edge.sourceHandle,
    };
  }

  return edge;
}

function normalizeCanvasViewportValue(value: unknown): CanvasViewport {
  const viewport =
    value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};

  return {
    x: Number(viewport.x || 0),
    y: Number(viewport.y || 0),
    zoom: Number(viewport.zoom || 1),
  };
}

function normalizeCanvasMedia(value: unknown): CanvasNodeMedia | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, unknown>;
  const url = typeof record.url === 'string' ? record.url.trim() : '';
  if (!url) {
    return null;
  }

  return {
    url,
    source: record.source === 'uploaded' ? 'uploaded' : 'generated',
    assetId: normalizeCanvasNullableText(record.assetId),
    mimeType: normalizeCanvasNullableText(record.mimeType),
    thumbnailUrl: normalizeCanvasNullableText(record.thumbnailUrl),
    durationSec: normalizeCanvasNumber(record.durationSec),
    size: normalizeCanvasNumber(record.size),
  };
}

function normalizeCanvasMediaArray(value: unknown): CanvasNodeMedia[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => normalizeCanvasMedia(item))
    .filter((item): item is CanvasNodeMedia => Boolean(item));
}

function mergeCanvasMediaHistory(
  existing: CanvasNodeMedia[],
  incoming: CanvasNodeMedia[]
): CanvasNodeMedia[] {
  const merged: CanvasNodeMedia[] = [];
  const seen = new Set<string>();

  for (const item of [...existing, ...incoming]) {
    const key = item.assetId || item.url;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    merged.push(item);
  }

  return merged;
}

function normalizeCanvasNonNegativeText(value: unknown): string {
  if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
    return String(value);
  }

  if (typeof value !== 'string') {
    return '';
  }

  const normalized = value.trim();
  if (!normalized) {
    return '';
  }

  const numericValue = Number(normalized);
  if (!Number.isFinite(numericValue) || numericValue < 0) {
    return '';
  }

  return normalized;
}

function normalizeCanvasImageOutputIndex(
  value: unknown,
  outputCount: number,
  fallback = 0
): number {
  const normalizedFallback =
    outputCount > 0 ? Math.max(0, Math.min(outputCount - 1, fallback)) : 0;
  if (outputCount === 0) {
    return 0;
  }

  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return normalizedFallback;
  }

  return Math.max(0, Math.min(outputCount - 1, Math.floor(value)));
}

export function createDefaultCanvasNodeData(
  nodeType: CanvasNodeType,
  locale?: string | null
): CanvasNodeData {
  const defaults = getDefaultCanvasNodeCopy(locale, nodeType);

  if (nodeType === 'text') {
    return {
      title: defaults.title,
      subtitle: defaults.subtitle,
      nodeType,
      prompt: '',
      model: DEFAULT_CANVAS_NODE_MODEL.text,
      status: 'idle',
      errorMessage: null,
      lastRunId: null,
      lastCompletedAt: null,
      lastScene: null,
      costCredits: null,
      plainText: '',
    };
  }

  if (nodeType === 'note') {
    return {
      title: defaults.title,
      subtitle: defaults.subtitle,
      nodeType,
      prompt: '',
      model: DEFAULT_CANVAS_NODE_MODEL.note,
      status: 'idle',
      errorMessage: null,
      lastRunId: null,
      lastCompletedAt: null,
      lastScene: null,
      costCredits: null,
      noteHtml: '',
    };
  }

  if (nodeType === 'image') {
    return {
      title: defaults.title,
      subtitle: defaults.subtitle,
      nodeType,
      prompt: '',
      model: DEFAULT_CANVAS_NODE_MODEL.image,
      status: 'idle',
      errorMessage: null,
      lastRunId: null,
      lastCompletedAt: null,
      lastScene: null,
      costCredits: null,
      image: null,
      imageOutputs: [],
      selectedImageIndex: 0,
      inputMode: 'generate',
      sceneMode: 'auto',
      aspectRatio: '1:1',
      resolution: '1K',
      imageWeight: '',
      styleReferenceWeight: '',
      omniReferenceWeight: '',
    };
  }

  if (nodeType === 'audio') {
    return {
      title: defaults.title,
      subtitle: defaults.subtitle,
      nodeType,
      prompt: '',
      model: DEFAULT_CANVAS_NODE_MODEL.audio,
      status: 'idle',
      errorMessage: null,
      lastRunId: null,
      lastCompletedAt: null,
      lastScene: null,
      costCredits: null,
      audio: null,
      inputMode: 'generate',
      soundLoop: false,
      soundTempo: '',
      soundKey: 'Any',
    };
  }

  return {
    title: defaults.title,
    subtitle: defaults.subtitle,
    nodeType,
    prompt: '',
    model: DEFAULT_CANVAS_NODE_MODEL.video,
    status: 'idle',
    errorMessage: null,
    lastRunId: null,
    lastCompletedAt: null,
    lastScene: null,
    costCredits: null,
    video: null,
    videoHistory: [],
    selectedVideoIndex: 0,
    inputMode: 'generate',
    referenceMode: 'auto',
    aspectRatio: '16:9',
    resolution: '720p',
    duration: '5',
  };
}

function normalizeCanvasBaseData(
  nodeType: CanvasNodeType,
  value: unknown
): CanvasNodeBaseData {
  const defaults = createDefaultCanvasNodeData(nodeType);
  const record =
    value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};

  return {
    title: normalizeCanvasText(record.title, defaults.title),
    subtitle: normalizeCanvasText(record.subtitle, defaults.subtitle),
    nodeType,
    prompt: normalizeCanvasText(record.prompt),
    model: normalizeCanvasText(record.model, defaults.model),
    status:
      record.status === 'queued' ||
      record.status === 'running' ||
      record.status === 'success' ||
      record.status === 'error'
        ? record.status
        : 'idle',
    errorMessage: normalizeCanvasNullableText(record.errorMessage),
    lastRunId: normalizeCanvasNullableText(record.lastRunId),
    lastCompletedAt: normalizeCanvasNullableText(record.lastCompletedAt),
    lastScene:
      typeof record.lastScene === 'string' && record.lastScene.trim()
        ? (record.lastScene as CanvasExecutionScene)
        : null,
    costCredits: normalizeCanvasNumber(record.costCredits),
  };
}

export function normalizeCanvasNodeData(
  nodeType: CanvasNodeType,
  value: unknown
): CanvasNodeData {
  const base = normalizeCanvasBaseData(nodeType, value);
  const record =
    value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};

  if (nodeType === 'text') {
    return {
      ...base,
      nodeType,
      plainText: normalizeCanvasText(record.plainText),
    };
  }

  if (nodeType === 'note') {
    return {
      ...base,
      nodeType,
      noteHtml: normalizeCanvasText(record.noteHtml),
    };
  }

  if (nodeType === 'image') {
    const imageOutputs = normalizeCanvasMediaArray(record.imageOutputs);
    const normalizedImage = normalizeCanvasMedia(record.image);
    const matchingIndex =
      normalizedImage && imageOutputs.length > 0
        ? imageOutputs.findIndex((item) => item.url === normalizedImage.url)
        : -1;
    const selectedImageIndex = normalizeCanvasImageOutputIndex(
      record.selectedImageIndex,
      imageOutputs.length,
      matchingIndex >= 0 ? matchingIndex : 0
    );
    const selectedOutput = imageOutputs[selectedImageIndex] || null;

    return {
      ...base,
      nodeType,
      image: selectedOutput || normalizedImage,
      imageOutputs,
      selectedImageIndex,
      inputMode: record.inputMode === 'upload' ? 'upload' : 'generate',
      sceneMode:
        record.sceneMode === 'text-to-image' ||
        record.sceneMode === 'image-to-image'
          ? record.sceneMode
          : 'auto',
      ...normalizeCanvasImageSettingsForModel({
        model: base.model,
        aspectRatio: record.aspectRatio,
        resolution: record.resolution,
      }),
      imageWeight: normalizeCanvasNonNegativeText(record.imageWeight),
      styleReferenceWeight: normalizeCanvasNonNegativeText(
        record.styleReferenceWeight
      ),
      omniReferenceWeight: normalizeCanvasNonNegativeText(
        record.omniReferenceWeight
      ),
    };
  }

  if (nodeType === 'video') {
    const videoHistory = normalizeCanvasMediaArray(record.videoHistory);
    const normalizedVideo = normalizeCanvasMedia(record.video);
    const matchingIndex =
      normalizedVideo && videoHistory.length > 0
        ? videoHistory.findIndex((item) => item.url === normalizedVideo.url)
        : -1;
    const selectedVideoIndex = normalizeCanvasImageOutputIndex(
      record.selectedVideoIndex,
      videoHistory.length,
      matchingIndex >= 0 ? matchingIndex : 0
    );
    const selectedVideo = videoHistory[selectedVideoIndex] || null;

    return {
      ...base,
      nodeType,
      video: selectedVideo || normalizedVideo,
      videoHistory,
      selectedVideoIndex,
      inputMode: record.inputMode === 'upload' ? 'upload' : 'generate',
      referenceMode:
        record.referenceMode === 'first_frame' ||
        record.referenceMode === 'first_last_frames' ||
        record.referenceMode === 'omni_reference'
          ? record.referenceMode
          : 'auto',
      ...normalizeCanvasVideoSettingsForModel({
        model: base.model,
        aspectRatio: record.aspectRatio,
        resolution: record.resolution,
        duration: record.duration,
      }),
    };
  }

  return {
    ...base,
    nodeType,
    audio: normalizeCanvasMedia(record.audio),
    inputMode: record.inputMode === 'upload' ? 'upload' : 'generate',
    soundLoop: record.soundLoop === true,
    soundTempo: normalizeCanvasText(record.soundTempo),
    soundKey: normalizeCanvasSoundKey(record.soundKey),
  };
}

export function applyCanvasNodePatchToData(
  data: CanvasNodeData,
  patch: Omit<CanvasNodePatch, 'nodeId'>
): CanvasNodeData {
  const nextBase: CanvasNodeBaseData = {
    ...data,
    status: patch.status ?? data.status,
    errorMessage:
      patch.errorMessage === undefined ? data.errorMessage : patch.errorMessage,
    lastRunId: patch.lastRunId === undefined ? data.lastRunId : patch.lastRunId,
    lastCompletedAt:
      patch.lastCompletedAt === undefined
        ? data.lastCompletedAt
        : patch.lastCompletedAt,
    lastScene: patch.lastScene === undefined ? data.lastScene : patch.lastScene,
    costCredits:
      patch.costCredits === undefined ? data.costCredits : patch.costCredits,
  };

  if (data.nodeType === 'text') {
    return {
      ...nextBase,
      nodeType: data.nodeType,
      plainText:
        patch.plainText === undefined ? data.plainText : patch.plainText,
    };
  }

  if (data.nodeType === 'note') {
    return {
      ...nextBase,
      nodeType: data.nodeType,
      noteHtml: patch.noteHtml === undefined ? data.noteHtml : patch.noteHtml,
    };
  }

  if (data.nodeType === 'image') {
    const nextImageOutputs =
      patch.imageOutputs === undefined
        ? data.imageOutputs
        : mergeCanvasMediaHistory(data.imageOutputs, patch.imageOutputs);
    const patchedImage = patch.image === undefined ? data.image : patch.image;
    const patchedImageIndex = patchedImage
      ? nextImageOutputs.findIndex((item) => item.url === patchedImage.url)
      : -1;
    const nextSelectedImageIndex = normalizeCanvasImageOutputIndex(
      patchedImageIndex >= 0
        ? patchedImageIndex
        : patch.selectedImageIndex === undefined
        ? patchedImageIndex >= 0
          ? patchedImageIndex
          : data.selectedImageIndex
        : patch.selectedImageIndex,
      nextImageOutputs.length,
      data.selectedImageIndex
    );
    const nextImage =
      nextImageOutputs[nextSelectedImageIndex] ||
      patchedImage;

    return {
      ...nextBase,
      nodeType: data.nodeType,
      image: nextImage,
      imageOutputs: nextImageOutputs,
      selectedImageIndex: nextSelectedImageIndex,
      inputMode: data.inputMode,
      sceneMode: data.sceneMode,
      aspectRatio: data.aspectRatio,
      resolution: data.resolution,
      imageWeight: data.imageWeight,
      styleReferenceWeight: data.styleReferenceWeight,
      omniReferenceWeight: data.omniReferenceWeight,
    };
  }

  if (data.nodeType === 'video') {
    const nextVideoHistory =
      patch.videoHistory === undefined
        ? data.videoHistory
        : mergeCanvasMediaHistory(data.videoHistory, patch.videoHistory);
    const patchedVideo = patch.video === undefined ? data.video : patch.video;
    const patchedVideoIndex = patchedVideo
      ? nextVideoHistory.findIndex((item) => item.url === patchedVideo.url)
      : -1;
    const nextSelectedVideoIndex = normalizeCanvasImageOutputIndex(
      patchedVideoIndex >= 0
        ? patchedVideoIndex
        : patch.selectedVideoIndex === undefined
        ? patchedVideoIndex >= 0
          ? patchedVideoIndex
          : data.selectedVideoIndex
        : patch.selectedVideoIndex,
      nextVideoHistory.length,
      data.selectedVideoIndex
    );

    return {
      ...nextBase,
      nodeType: data.nodeType,
      video: nextVideoHistory[nextSelectedVideoIndex] || patchedVideo,
      videoHistory: nextVideoHistory,
      selectedVideoIndex: nextSelectedVideoIndex,
      inputMode: data.inputMode,
      referenceMode: data.referenceMode,
      aspectRatio: data.aspectRatio,
      resolution: data.resolution,
      duration: data.duration,
    };
  }

  return {
    ...nextBase,
    nodeType: data.nodeType,
    audio: patch.audio === undefined ? data.audio : patch.audio,
    inputMode: data.inputMode,
    soundLoop: data.soundLoop,
    soundTempo: data.soundTempo,
    soundKey: data.soundKey,
  };
}

export function createEmptyCanvasGraph(): SerializedCanvasGraph {
  return {
    version: 1,
    viewport: {
      x: 0,
      y: 0,
      zoom: 1,
    },
    nodes: [],
    edges: [],
  };
}

function resetCanvasNodeRuntimeState(data: CanvasNodeData): CanvasNodeData {
  const nextBase = {
    ...data,
    status: 'idle' as const,
    errorMessage: null,
    lastRunId: null,
    lastCompletedAt: null,
    lastScene: null,
    costCredits: null,
  };

  if (data.nodeType === 'text') {
    return {
      ...nextBase,
      nodeType: data.nodeType,
      plainText: data.plainText,
    };
  }

  if (data.nodeType === 'note') {
    return {
      ...nextBase,
      nodeType: data.nodeType,
      noteHtml: data.noteHtml,
    };
  }

  if (data.nodeType === 'image') {
    return {
      ...nextBase,
      nodeType: data.nodeType,
      image: data.image,
      imageOutputs: data.imageOutputs,
      selectedImageIndex: data.selectedImageIndex,
      inputMode: data.inputMode,
      sceneMode: data.sceneMode,
      aspectRatio: data.aspectRatio,
      resolution: data.resolution,
      imageWeight: data.imageWeight,
      styleReferenceWeight: data.styleReferenceWeight,
      omniReferenceWeight: data.omniReferenceWeight,
    };
  }

  if (data.nodeType === 'video') {
    return {
      ...nextBase,
      nodeType: data.nodeType,
      video: data.video,
      videoHistory: data.videoHistory,
      selectedVideoIndex: data.selectedVideoIndex,
      inputMode: data.inputMode,
      referenceMode: data.referenceMode,
      aspectRatio: data.aspectRatio,
      resolution: data.resolution,
      duration: data.duration,
    };
  }

  return {
    ...nextBase,
    nodeType: data.nodeType,
    audio: data.audio,
    inputMode: data.inputMode,
    soundLoop: data.soundLoop,
    soundTempo: data.soundTempo,
    soundKey: data.soundKey,
  };
}

function isCanvasNodeType(value: unknown): value is CanvasNodeType {
  return (
    value === 'text' ||
    value === 'note' ||
    value === 'image' ||
    value === 'video' ||
    value === 'audio'
  );
}

export function normalizeCanvasGraph(
  value: Partial<SerializedCanvasGraph> | null | undefined
): SerializedCanvasGraph {
  const nodes = Array.isArray(value?.nodes)
    ? value.nodes
        .filter(
          (node): node is SerializedCanvasNode =>
            Boolean(node?.id) && isCanvasNodeType(node?.type)
        )
        .map((node) => ({
          id: node.id,
          type: node.type,
          position: normalizeCanvasPosition(node.position),
          width:
            typeof node.width === 'number' && Number.isFinite(node.width)
              ? node.width
              : undefined,
          height:
            typeof node.height === 'number' && Number.isFinite(node.height)
              ? node.height
              : undefined,
          data: normalizeCanvasNodeData(node.type, node.data),
        }))
    : [];

  const edges = Array.isArray(value?.edges)
    ? (() => {
        const seenConnectionKeys = new Set<string>();
        return value.edges
          .filter(
            (edge): edge is SerializedCanvasEdge =>
              Boolean(edge?.id) &&
              typeof edge?.source === 'string' &&
              typeof edge?.target === 'string'
          )
          .map((edge) =>
            normalizeSerializedCanvasEdgeDirection({
              id: edge.id,
              source: edge.source,
              target: edge.target,
              sourceHandle: normalizeCanvasHandle(edge.sourceHandle),
              targetHandle: normalizeCanvasHandle(edge.targetHandle),
              type:
                typeof edge.type === 'string' && edge.type !== 'smoothstep'
                  ? edge.type
                  : 'default',
              data:
                edge.data &&
                typeof edge.data === 'object' &&
                !Array.isArray(edge.data)
                  ? edge.data
                  : undefined,
            })
          )
          .filter((edge) => {
            const semanticKey = [
              edge.source,
              edge.sourceHandle || '',
              edge.target,
              edge.targetHandle || '',
            ].join('::');
            if (seenConnectionKeys.has(semanticKey)) {
              return false;
            }
            seenConnectionKeys.add(semanticKey);
            return true;
          });
      })()
    : [];

  return {
    version: 1,
    viewport: normalizeCanvasViewportValue(value?.viewport),
    nodes,
    edges,
  };
}

export function createCanvasTemplateGraphSnapshot(
  graph: SerializedCanvasGraph
): SerializedCanvasGraph {
  const normalized = normalizeCanvasGraph(graph);

  return {
    ...normalized,
    nodes: normalized.nodes.map((node) => ({
      ...node,
      data: resetCanvasNodeRuntimeState(
        normalizeCanvasNodeData(node.type, node.data)
      ),
    })),
  };
}

export function parseCanvasGraph(
  value: string | null | undefined
): SerializedCanvasGraph {
  if (!value) {
    return createEmptyCanvasGraph();
  }

  try {
    return normalizeCanvasGraph(
      JSON.parse(value) as Partial<SerializedCanvasGraph>
    );
  } catch {
    return createEmptyCanvasGraph();
  }
}

export function serializeCanvasGraph(
  graph: SerializedCanvasGraph | null | undefined
): string {
  return JSON.stringify(graph || createEmptyCanvasGraph());
}

export function getCanvasNodeById(
  graph: SerializedCanvasGraph,
  nodeId: string
): SerializedCanvasNode | null {
  return graph.nodes.find((node) => node.id === nodeId) || null;
}

export function applyCanvasNodePatch(
  graph: SerializedCanvasGraph,
  patch: CanvasNodePatch
): SerializedCanvasGraph | null {
  let found = false;
  const nextNodes = graph.nodes.map((node) => {
    if (node.id !== patch.nodeId) {
      return node;
    }

    found = true;
    return {
      ...node,
      data: applyCanvasNodePatchToData(
        normalizeCanvasNodeData(node.type, node.data),
        patch
      ),
    };
  });

  if (!found) {
    return null;
  }

  return {
    ...graph,
    nodes: nextNodes,
  };
}

export function summarizeCanvasGraph(
  graph: SerializedCanvasGraph
): CanvasPreviewSummary {
  let heroNodeType: CanvasPreviewSummary['heroNodeType'] = null;
  let heroTitle: string | null = null;
  let heroMedia: CanvasNodeMedia | null = null;
  let textSnippet: string | null = null;

  for (let index = graph.nodes.length - 1; index >= 0; index -= 1) {
    const node = graph.nodes[index];
    const data = normalizeCanvasNodeData(node.type, node.data);

    if (
      !textSnippet &&
      (data.nodeType === 'text' || data.nodeType === 'note')
    ) {
      const nextText =
        data.nodeType === 'text'
          ? data.plainText.trim() || data.prompt.trim()
          : data.noteHtml
              .replace(/<[^>]*>/g, ' ')
              .replace(/\s+/g, ' ')
              .trim();
      if (nextText) {
        textSnippet = nextText.slice(0, 160);
      }
    }

    if (!heroMedia && data.nodeType === 'image' && data.image?.url) {
      heroNodeType = 'image';
      heroTitle = data.title;
      heroMedia = data.image;
    }

    if (!heroMedia && data.nodeType === 'video' && data.video?.url) {
      heroNodeType = 'video';
      heroTitle = data.title;
      heroMedia = data.video;
    }

    if (heroMedia && textSnippet) {
      break;
    }
  }

  return {
    nodeCount: graph.nodes.length,
    // Note nodes are counted in the total only.
    imageCount: graph.nodes.filter((node) => node.type === 'image').length,
    videoCount: graph.nodes.filter((node) => node.type === 'video').length,
    audioCount: graph.nodes.filter((node) => node.type === 'audio').length,
    heroNodeType,
    heroTitle,
    heroMedia,
    textSnippet,
  };
}
