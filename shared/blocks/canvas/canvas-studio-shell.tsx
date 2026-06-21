'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Background,
  BaseEdge,
  Connection,
  ConnectionMode,
  Edge,
  EdgeLabelRenderer,
  EdgeProps,
  FinalConnectionState,
  getBezierPath,
  Handle,
  MiniMap,
  NodeProps,
  Panel,
  Position,
  ReactFlow,
  ReactFlowProvider,
  SelectionMode,
  useReactFlow,
} from '@xyflow/react';

import '@xyflow/react/dist/style.css';

import {
  AlertTriangle,
  ArrowLeft,
  AudioLines,
  Bold,
  ChevronDown,
  Coins,
  Copy,
  Download,
  Expand,
  ExternalLink,
  Headphones,
  Image as ImageIcon,
  ImagePlus,
  Italic,
  ListVideo,
  LoaderCircle,
  Map as MapIcon,
  Pencil,
  Plus,
  Redo2,
  RefreshCw,
  RotateCcw,
  Save,
  Scissors,
  Share2,
  SlidersHorizontal,
  Sparkles,
  StickyNote,
  Trash2,
  Type,
  Underline,
  Undo2,
  Upload,
  Video,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

import { Link } from '@/core/i18n/navigation';
import { AIMediaType } from '@/extensions/ai/types';
import { CanvasMediaControl } from '@/shared/blocks/canvas/canvas-media-control';
import { LazyVideo } from '@/shared/blocks/common/lazy-video';
import { ModelSelectOption } from '@/shared/blocks/generator/model-select-option';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/shared/components/ui/hover-card';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Progress } from '@/shared/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/shared/components/ui/tabs';
import { Textarea } from '@/shared/components/ui/textarea';
import { useAppContext } from '@/shared/contexts/app';
import {
  quoteAICredits,
  type AICreditScene,
} from '@/shared/lib/ai-credit-rules';
import {
  buildCanvasNodeTaskDescriptor,
  inferCanvasExecutionScene,
  isFinalCanvasRunStatus,
  resolveCanvasNodeInputs,
} from '@/shared/lib/canvas/execution';
import {
  buildUntitledCanvasTitle,
  canvasT,
  getCanvasNodeTypeLabel,
  getCanvasSoundKeyLabel,
  localizeCanvasNodeTitle,
  localizeCanvasTitle,
  translateCanvasRuntimeMessage,
  type CanvasTranslator,
} from '@/shared/lib/canvas/i18n';
import {
  useCanvasLocale,
  useCanvasTranslations,
} from '@/shared/lib/canvas/use-canvas-translations';
import {
  getCanvasImageAspectRatioOptions as getCanvasImageAspectRatioOptionsFromConfig,
  getCanvasVideoAspectRatioOptions as getCanvasVideoAspectRatioOptionsFromConfig,
  getCanvasVideoDurationOptions as getCanvasVideoDurationOptionsFromConfig,
  getCanvasVideoResolutionOptions as getCanvasVideoResolutionOptionsFromConfig,
  isMidjourneyCanvasImageModel as isMidjourneyCanvasImageModelFromConfig,
  normalizeCanvasImageSettingsForModel as normalizeCanvasImageSettingsForModelFromConfig,
  normalizeCanvasVideoSettingsForModel as normalizeCanvasVideoSettingsForModelFromConfig,
} from '@/shared/lib/canvas/model-options';
import {
  buildCanvasGraphFromFlow,
  normalizeCanvasViewport,
  type CanvasFlowNode,
} from '@/shared/lib/canvas/serialization';
import {
  CanvasAudioNodeData,
  CanvasImageNodeData,
  CanvasMediaInputMode,
  CanvasNodeMedia,
  CanvasVideoNodeData,
  getCanvasNodeById,
  normalizeCanvasNodeData,
  parseCanvasGraph,
  type CanvasDocumentRecord,
  type CanvasNodeData,
  type CanvasNodePatch,
  type CanvasNodeType,
  type SerializedCanvasGraph,
  type SerializedCanvasNode,
} from '@/shared/lib/canvas/types';
import { validateCanvasGraph } from '@/shared/lib/canvas/validation';
import {
  readCanvasModelPreferences,
  writeCanvasModelPreferences,
} from '@/shared/lib/model-preferences';
import { cn } from '@/shared/lib/utils';
import {
  getPublicModelLabel,
  listPublicModels,
  resolvePublicModelRoute,
} from '@/shared/services/public-ai-models';
import {
  useCanvasStore,
  type CanvasClipboardEdgeSnapshot,
  type CanvasClipboardNodeSnapshot,
} from '@/shared/stores/canvas-store';

import {
  getVideoDuration,
  IMAGE_ACCEPT,
  MAX_IMAGE_SIZE_BYTES,
  MAX_VIDEO_SIZE_BYTES,
  uploadCanvasImage,
  uploadCanvasVideo,
  VIDEO_ACCEPT,
} from './canvas-media-control';

const IMAGE_MODEL_OPTIONS = listPublicModels({
  mediaType: AIMediaType.IMAGE,
});
const HIDDEN_VIDEO_MODELS = new Set([
  'sora-2',
  'seedance-2',
  'seedance-2-fast',
  'seedance-2-preview',
  'seedance-2-fast-preview',
  'seedance-2-watermark-remover',
  'kling-video-o1',
]);
const LEGACY_CANVAS_VIDEO_MODEL_REDIRECTS: Record<string, string> = {
  'seedance-2': 'seedance-2-ark',
  'seedance-2-fast': 'seedance-2-fast-ark',
};
const VIDEO_MODEL_OPTIONS = listPublicModels({
  mediaType: AIMediaType.VIDEO,
}).filter((item) => !HIDDEN_VIDEO_MODELS.has(item.model));
const AUDIO_MODEL_OPTIONS = listPublicModels({
  mediaType: AIMediaType.AUDIO,
});
const TEXT_MODEL_OPTIONS = ['gemini-3-flash'];
const IMAGE_RESOLUTION_OPTIONS = ['1K', '2K', '4K'];
const VIDEO_REFERENCE_MODE_OPTIONS = [
  'auto',
  'first_frame',
  'first_last_frames',
  'omni_reference',
] as const;
const CANVAS_CLIPBOARD_MIME = 'application/x-cyberbara-canvas-nodes';

type CanvasClipboardPayload = {
  version: 1;
  nodes: CanvasClipboardNodeSnapshot[];
  edges: CanvasClipboardEdgeSnapshot[];
};

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return Boolean(
    target.closest(
      'input, textarea, select, [contenteditable="true"], [role="textbox"]'
    )
  );
}

function parseCanvasClipboardPayload(raw: string | null | undefined) {
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as CanvasClipboardPayload;
    if (
      parsed?.version !== 1 ||
      !Array.isArray(parsed.nodes) ||
      !Array.isArray(parsed.edges)
    ) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}
const AUDIO_KEY_OPTIONS = [
  'Any',
  'Cm',
  'C#m',
  'Dm',
  'D#m',
  'Em',
  'Fm',
  'F#m',
  'Gm',
  'G#m',
  'Am',
  'A#m',
  'Bm',
  'C',
  'C#',
  'D',
  'D#',
  'E',
  'F',
  'F#',
  'G',
  'G#',
  'A',
  'A#',
  'B',
];
const CANVAS_SELECT_CONTENT_CLASS =
  'border-white/10 bg-[#111111] text-white shadow-[0_20px_60px_rgba(0,0,0,0.45)]';
const CANVAS_MIN_ZOOM_PERCENT = 25;
const CANVAS_MAX_ZOOM_PERCENT = 180;
const MIDJOURNEY_IMAGE_WEIGHT_MAX = 3;
const MIDJOURNEY_REFERENCE_WEIGHT_SLIDER_MAX = 1000;
const MIDJOURNEY_WEIGHT_STEP = 0.1;

const NODE_CARD_STYLES: Record<CanvasNodeType, string> = {
  text: 'w-[320px]',
  note: 'w-[320px]',
  image: 'w-[340px]',
  video: 'w-[356px]',
  audio: 'w-[340px]',
};

const NODE_ICON_MAP = {
  text: Type,
  note: StickyNote,
  image: ImageIcon,
  video: Video,
  audio: AudioLines,
} satisfies Record<CanvasNodeType, typeof Type>;

type CanvasConnectionHandleId =
  | 'left'
  | 'right'
  | 'style-reference'
  | 'omni-reference';

type CanvasReferenceKind =
  | 'default'
  | 'image-prompts'
  | 'style-reference'
  | 'omni-reference';

type PendingCanvasConnection = {
  sourceNodeId: string;
  sourceNodeType: CanvasNodeType;
  sourceHandleId: CanvasConnectionHandleId;
};

type CanvasMenuState = {
  x: number;
  y: number;
  flowPosition: { x: number; y: number };
  mode: 'quick-add' | 'pane' | 'connection' | 'node' | 'edge';
  pendingConnection?: PendingCanvasConnection;
  nodeId?: string;
  edgeId?: string;
};

type CanvasMenuItem = {
  nodeType: CanvasNodeType;
  label: string;
  description?: string;
  icon: typeof Type;
  recommended?: boolean;
  disabled?: boolean;
  disabledReason?: string;
};

type CanvasReferenceItem = {
  edgeId: string;
  sourceNodeId: string;
  sourceNodeType: CanvasNodeType;
  kind: CanvasReferenceKind;
  token: string;
  title: string;
  text?: string;
  media?: CanvasNodeMedia | null;
};

type CanvasImagePreviewState = {
  images: CanvasNodeMedia[];
  activeIndex: number;
  title: string;
  nodeId?: string;
};

type CanvasImageEditorState = {
  sessionId: string;
  nodeId: string;
  media: CanvasNodeMedia;
  title: string;
};

type CanvasImageEditorSavePayload = {
  file: File;
  startedAt: number;
  exportedAt: number;
  canvasWidth: number;
  canvasHeight: number;
};

function formatDateTime(
  locale: string,
  t: CanvasTranslator,
  value: string | null
) {
  if (!value) {
    return canvasT(t, 'studio.waitingFirstSave');
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return canvasT(t, 'studio.waitingFirstSave');
  }

  return date.toLocaleString(locale);
}

function getNodeStatusProgress(status: CanvasNodeData['status']) {
  switch (status) {
    case 'queued':
      return 20;
    case 'running':
      return 68;
    case 'success':
      return 100;
    case 'error':
      return 100;
    default:
      return 0;
  }
}

function isMidjourneyCanvasImageModel(model: string): boolean {
  return isMidjourneyCanvasImageModelFromConfig(model);
}

function isArkCanvasVideoModel(model: string): boolean {
  return (
    model === 'seedance-2-ark' ||
    model === 'seedance-2-fast-ark' ||
    model === 'seedance-2-mini-ark'
  );
}

function isKieSeedanceCanvasVideoModel(model: string): boolean {
  return model === 'seedance-2-stable' || model === 'seedance-2-fast-stable';
}

function isSeedanceCanvasReferenceModeModel(model: string): boolean {
  return isArkCanvasVideoModel(model) || isKieSeedanceCanvasVideoModel(model);
}

function isCanvasLeftHandle(handleId: CanvasConnectionHandleId): boolean {
  return handleId !== 'right';
}

function getCanvasReferenceKindFromHandle(
  handleId?: string
): CanvasReferenceKind {
  if (handleId === 'style-reference') {
    return 'style-reference';
  }

  if (handleId === 'omni-reference') {
    return 'omni-reference';
  }

  return 'image-prompts';
}

function getCanvasHandleIdForReferenceKind(
  kind: CanvasReferenceKind
): CanvasConnectionHandleId {
  if (kind === 'style-reference') {
    return 'style-reference';
  }

  if (kind === 'omni-reference') {
    return 'omni-reference';
  }

  return 'left';
}

function getCanvasReferenceKindLabel(
  t: CanvasTranslator,
  kind: CanvasReferenceKind
): string {
  if (kind === 'image-prompts') {
    return canvasT(t, 'studio.imagePrompts');
  }

  if (kind === 'style-reference') {
    return canvasT(t, 'studio.styleReference');
  }

  if (kind === 'omni-reference') {
    return canvasT(t, 'studio.omniReference');
  }

  return canvasT(t, 'studio.reference');
}

function normalizeMjReferenceZoneKind(
  kind: CanvasReferenceKind
): Extract<
  CanvasReferenceKind,
  'image-prompts' | 'style-reference' | 'omni-reference'
> {
  if (kind === 'style-reference' || kind === 'omni-reference') {
    return kind;
  }

  return 'image-prompts';
}

function getCanvasImageOutputs(
  nodeData: CanvasImageNodeData
): CanvasNodeMedia[] {
  if (nodeData.imageOutputs.length > 0) {
    const usableOutputs = nodeData.imageOutputs.filter(
      (media) => !isLikelyBlankCanvasEditedImage(media)
    );
    return usableOutputs.length > 0 ? usableOutputs : nodeData.imageOutputs;
  }

  return nodeData.image ? [nodeData.image] : [];
}

function isLikelyBlankCanvasEditedImage(media: CanvasNodeMedia) {
  const sourceUrl = `${media.url || ''} ${media.thumbnailUrl || ''}`;
  return (
    sourceUrl.includes('/cyberbara_uploads/canvas/') &&
    sourceUrl.includes('/images/') &&
    typeof media.size === 'number' &&
    media.size > 0 &&
    media.size <= 2048
  );
}

function getCanvasVideoHistory(
  nodeData: CanvasVideoNodeData
): CanvasNodeMedia[] {
  if (nodeData.videoHistory.length > 0) {
    return nodeData.videoHistory;
  }

  return nodeData.video ? [nodeData.video] : [];
}

function clampCanvasImageIndex(
  index: number,
  imageCount: number,
  fallback = 0
): number {
  if (imageCount <= 0) {
    return 0;
  }

  if (!Number.isFinite(index)) {
    return Math.max(0, Math.min(imageCount - 1, fallback));
  }

  return Math.max(0, Math.min(imageCount - 1, Math.floor(index)));
}

function getEditableCanvasImage(
  t: CanvasTranslator,
  nodeData: CanvasNodeData | null | undefined
) {
  if (!nodeData || nodeData.nodeType !== 'image') {
    return null;
  }

  const imageOutputs = getCanvasImageOutputs(nodeData);
  const selectedImageIndex = clampCanvasImageIndex(
    nodeData.selectedImageIndex,
    imageOutputs.length
  );
  const media = imageOutputs[selectedImageIndex] || nodeData.image;

  if (!media?.url) {
    return null;
  }

  return {
    media,
    title: localizeCanvasNodeTitle(t, nodeData.nodeType, nodeData.title),
  };
}

function sanitizeCanvasNoteHtml(value: string): string {
  if (typeof window === 'undefined') {
    return value;
  }

  const template = document.createElement('template');
  template.innerHTML = value;
  const allowedTags = new Set([
    'B',
    'STRONG',
    'I',
    'EM',
    'U',
    'BR',
    'DIV',
    'P',
  ]);

  const walk = (node: Node) => {
    for (const child of Array.from(node.childNodes)) {
      if (child.nodeType === Node.COMMENT_NODE) {
        child.remove();
        continue;
      }

      if (child.nodeType !== Node.ELEMENT_NODE) {
        continue;
      }

      const element = child as HTMLElement;
      if (!allowedTags.has(element.tagName)) {
        element.replaceWith(...Array.from(element.childNodes));
        continue;
      }

      for (const attribute of Array.from(element.attributes)) {
        element.removeAttribute(attribute.name);
      }
      walk(element);
    }
  };

  walk(template.content);
  return template.innerHTML;
}

function getCanvasImageAspectRatioOptions(nodeData: CanvasImageNodeData) {
  return getCanvasImageAspectRatioOptionsFromConfig(nodeData.model);
}

function parseAspectRatioValue(value: string): number | null {
  const [width, height] = value.split(':').map((item) => Number(item));
  if (!Number.isFinite(width) || !Number.isFinite(height) || height <= 0) {
    return null;
  }

  return width / height;
}

function pickClosestCanvasAspectRatio({
  width,
  height,
  options,
}: {
  width: number;
  height: number;
  options: string[];
}) {
  if (width <= 0 || height <= 0) {
    return null;
  }

  const targetRatio = width / height;
  let bestOption: string | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const option of options) {
    if (option.toLowerCase() === 'auto') {
      continue;
    }

    const optionRatio = parseAspectRatioValue(option);
    if (!optionRatio) {
      continue;
    }

    const distance = Math.abs(Math.log(targetRatio / optionRatio));
    if (distance < bestDistance) {
      bestDistance = distance;
      bestOption = option;
    }
  }

  return bestOption;
}

async function getImageFileDimensions(file: File) {
  if (typeof createImageBitmap === 'function') {
    const bitmap = await createImageBitmap(file);
    const dimensions = {
      width: bitmap.width,
      height: bitmap.height,
    };
    bitmap.close();
    return dimensions;
  }

  return new Promise<{ width: number; height: number }>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new window.Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve({
        width: image.naturalWidth,
        height: image.naturalHeight,
      });
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('image_dimension_read_failed'));
    };
    image.src = url;
  });
}

function shouldShowCanvasImageResolutionControl(nodeData: CanvasImageNodeData) {
  return !isMidjourneyCanvasImageModel(nodeData.model);
}

function normalizeCanvasImageNodeSettingsForModel(
  nodeData: CanvasImageNodeData,
  nextModel: string
) {
  return {
    model: nextModel,
    ...normalizeCanvasImageSettingsForModelFromConfig({
      model: nextModel,
      aspectRatio: nodeData.aspectRatio,
      resolution: nodeData.resolution,
    }),
  };
}

function buildCanvasDefaultPreferencePatch(
  nodeData: CanvasNodeData
): Partial<CanvasNodeData> {
  const preferences = readCanvasModelPreferences();

  if (nodeData.nodeType === 'image') {
    const preferredModel =
      preferences.image?.model &&
      IMAGE_MODEL_OPTIONS.some(
        (item) => item.model === preferences.image?.model
      )
        ? preferences.image.model
        : nodeData.model;
    const preferredOptions =
      preferences.image?.optionsByModel?.[preferredModel] || {};
    const normalizedSettings = normalizeCanvasImageSettingsForModelFromConfig({
      model: preferredModel,
      aspectRatio: preferredOptions.aspectRatio || nodeData.aspectRatio,
      resolution: preferredOptions.resolution || nodeData.resolution,
    });

    return {
      model: preferredModel,
      ...normalizedSettings,
      sceneMode:
        typeof preferredOptions.sceneMode === 'string'
          ? (preferredOptions.sceneMode as CanvasImageNodeData['sceneMode'])
          : nodeData.sceneMode,
      imageWeight:
        typeof preferredOptions.imageWeight === 'string'
          ? preferredOptions.imageWeight
          : nodeData.imageWeight,
      styleReferenceWeight:
        typeof preferredOptions.styleReferenceWeight === 'string'
          ? preferredOptions.styleReferenceWeight
          : nodeData.styleReferenceWeight,
      omniReferenceWeight:
        typeof preferredOptions.omniReferenceWeight === 'string'
          ? preferredOptions.omniReferenceWeight
          : nodeData.omniReferenceWeight,
    } as Partial<CanvasNodeData>;
  }

  if (nodeData.nodeType === 'video') {
    const preferredModel =
      preferences.video?.model &&
      VIDEO_MODEL_OPTIONS.some(
        (item) => item.model === preferences.video?.model
      )
        ? preferences.video.model
        : nodeData.model;
    const preferredOptions =
      preferences.video?.optionsByModel?.[preferredModel] || {};
    const normalizedSettings = normalizeCanvasVideoSettingsForModelFromConfig({
      model: preferredModel,
      aspectRatio: preferredOptions.aspectRatio || nodeData.aspectRatio,
      resolution: preferredOptions.resolution || nodeData.resolution,
      duration: preferredOptions.duration || nodeData.duration,
    });

    return {
      model: preferredModel,
      ...normalizedSettings,
      referenceMode:
        typeof preferredOptions.referenceMode === 'string'
          ? (preferredOptions.referenceMode as CanvasVideoNodeData['referenceMode'])
          : nodeData.referenceMode,
    } as Partial<CanvasNodeData>;
  }

  return {};
}

function shouldPersistCanvasPreferencePatch(patch: Partial<CanvasNodeData>) {
  return [
    'model',
    'aspectRatio',
    'resolution',
    'duration',
    'referenceMode',
    'sceneMode',
    'imageWeight',
    'styleReferenceWeight',
    'omniReferenceWeight',
  ].some((key) => key in patch);
}

function persistCanvasNodePreferences(
  nodeData: CanvasNodeData,
  patch: Partial<CanvasNodeData>
) {
  const nextData = {
    ...nodeData,
    ...patch,
  } as CanvasNodeData;

  if (nextData.nodeType === 'image') {
    writeCanvasModelPreferences('image', nextData.model, {
      aspectRatio: nextData.aspectRatio,
      resolution: nextData.resolution,
      sceneMode: nextData.sceneMode,
      imageWeight: nextData.imageWeight,
      styleReferenceWeight: nextData.styleReferenceWeight,
      omniReferenceWeight: nextData.omniReferenceWeight,
    });
    return;
  }

  if (nextData.nodeType === 'video') {
    writeCanvasModelPreferences('video', nextData.model, {
      aspectRatio: nextData.aspectRatio,
      resolution: nextData.resolution,
      duration: nextData.duration,
      referenceMode: nextData.referenceMode,
    });
  }
}

function normalizeCanvasMidjourneyWeightInput(value: string): string {
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

function getCanvasMidjourneyWeightSliderValue(
  value: string,
  max: number,
  min = 0
): number {
  const normalized = normalizeCanvasMidjourneyWeightInput(value);
  if (!normalized) {
    return min;
  }

  return Math.min(max, Math.max(min, Number(normalized)));
}

function getCanvasMediaSettingsSummary(
  nodeData: CanvasImageNodeData | CanvasVideoNodeData
) {
  const items =
    nodeData.nodeType === 'image' &&
    !shouldShowCanvasImageResolutionControl(nodeData)
      ? [nodeData.aspectRatio]
      : [nodeData.aspectRatio, nodeData.resolution];

  if (nodeData.nodeType === 'video') {
    items.push(`${nodeData.duration}s`);
  }

  return items.filter(Boolean).join(' · ');
}

function getNodeModelOptions(nodeType: CanvasNodeType) {
  if (nodeType === 'text' || nodeType === 'note') {
    return TEXT_MODEL_OPTIONS;
  }

  if (nodeType === 'image') {
    return IMAGE_MODEL_OPTIONS.map((item) => item.model);
  }

  if (nodeType === 'audio') {
    return AUDIO_MODEL_OPTIONS.map((item) => item.model);
  }

  return VIDEO_MODEL_OPTIONS.map((item) => item.model);
}

function getNodeModelOptionsForSelection(
  nodeData: CanvasNodeData,
  references: CanvasReferenceItem[]
) {
  const options = getNodeModelOptions(nodeData.nodeType);
  if (nodeData.nodeType !== 'video') {
    return options;
  }

  return options.filter((model) =>
    isModelSelectableForNode(nodeData, references, model)
  );
}

function getCanvasVideoDurationOptions(
  model: string,
  scene?: AICreditScene | null
) {
  return getCanvasVideoDurationOptionsFromConfig(model, scene);
}

function getCanvasVideoResolutionOptions(
  model: string,
  scene?: AICreditScene | null
) {
  return getCanvasVideoResolutionOptionsFromConfig(model, scene);
}

function getCanvasVideoAspectRatioOptions(
  model: string,
  scene?: AICreditScene | null
) {
  return getCanvasVideoAspectRatioOptionsFromConfig(model, scene);
}

function getCanvasConnectionDescription(
  t: CanvasTranslator,
  pendingConnection: PendingCanvasConnection,
  nodeType: CanvasNodeType
) {
  const leftNodeType = isCanvasLeftHandle(pendingConnection.sourceHandleId)
    ? nodeType
    : pendingConnection.sourceNodeType;
  const rightNodeType = isCanvasLeftHandle(pendingConnection.sourceHandleId)
    ? pendingConnection.sourceNodeType
    : nodeType;
  const leftLabel = getCanvasNodeTypeLabel(t, leftNodeType);
  const rightLabel = getCanvasNodeTypeLabel(t, rightNodeType);
  return `${leftLabel} -> ${rightLabel}`;
}

function isCanvasNodeConnectionCompatible(
  sourceNodeType: CanvasNodeType,
  targetNodeType: CanvasNodeType
) {
  if (sourceNodeType === 'note' || targetNodeType === 'note') {
    return false;
  }

  if (sourceNodeType === 'audio') {
    return targetNodeType === 'video';
  }

  if (sourceNodeType === 'video') {
    return targetNodeType === 'video';
  }

  if (targetNodeType === 'audio') {
    return sourceNodeType === 'text';
  }

  return true;
}

function getCanvasRecommendedNodeTypes(
  pendingConnection?: PendingCanvasConnection
): CanvasNodeType[] {
  const sourceNodeType = pendingConnection?.sourceNodeType;
  const isUpstream = pendingConnection
    ? isCanvasLeftHandle(pendingConnection.sourceHandleId)
    : false;

  if (isUpstream) {
    if (sourceNodeType === 'note') {
      return ['note', 'text', 'image', 'video', 'audio'];
    }

    if (sourceNodeType === 'image') {
      return ['image', 'text', 'video', 'audio'];
    }

    if (sourceNodeType === 'video') {
      return ['video', 'image', 'text', 'audio'];
    }

    if (sourceNodeType === 'audio') {
      return ['text', 'image', 'video', 'audio'];
    }

    if (sourceNodeType === 'text') {
      return ['text', 'image', 'video', 'audio'];
    }
  }

  if (sourceNodeType === 'image') {
    return ['image', 'video', 'text', 'audio'];
  }

  if (sourceNodeType === 'audio') {
    return ['video', 'text', 'image', 'audio'];
  }

  if (sourceNodeType === 'video') {
    return ['video', 'image', 'text', 'audio'];
  }

  if (sourceNodeType === 'text') {
    return ['image', 'video', 'audio', 'text'];
  }

  if (sourceNodeType === 'note') {
    return ['note', 'text', 'image', 'video', 'audio'];
  }

  return ['text', 'note', 'image', 'video', 'audio'];
}

function getCanvasMenuItemCompatibility(
  pendingConnection: PendingCanvasConnection,
  nodeType: CanvasNodeType
) {
  if (
    isCanvasLeftHandle(pendingConnection.sourceHandleId) &&
    pendingConnection.sourceHandleId !== 'left'
  ) {
    return nodeType === 'image';
  }

  if (isCanvasLeftHandle(pendingConnection.sourceHandleId)) {
    return isCanvasNodeConnectionCompatible(
      nodeType,
      pendingConnection.sourceNodeType
    );
  }

  return isCanvasNodeConnectionCompatible(
    pendingConnection.sourceNodeType,
    nodeType
  );
}

function getCanvasConnectionDisabledReason(
  t: CanvasTranslator,
  pendingConnection: PendingCanvasConnection,
  nodeType: CanvasNodeType
) {
  if (
    isCanvasLeftHandle(pendingConnection.sourceHandleId) &&
    pendingConnection.sourceHandleId !== 'left' &&
    nodeType !== 'image'
  ) {
    return canvasT(t, 'runtime.styleReferenceImagesOnly');
  }

  const sourceNodeType = isCanvasLeftHandle(pendingConnection.sourceHandleId)
    ? nodeType
    : pendingConnection.sourceNodeType;
  const targetNodeType = isCanvasLeftHandle(pendingConnection.sourceHandleId)
    ? pendingConnection.sourceNodeType
    : nodeType;

  if (sourceNodeType === 'video' && targetNodeType !== 'video') {
    return canvasT(t, 'runtime.videoOutputVideoOnly');
  }

  if (sourceNodeType === 'audio' && targetNodeType !== 'video') {
    return canvasT(t, 'runtime.audioOutputVideoOnly');
  }

  if (targetNodeType === 'audio' && sourceNodeType !== 'text') {
    return canvasT(t, 'runtime.audioTargetTextOnly');
  }

  if (targetNodeType === 'image' && sourceNodeType === 'video') {
    return canvasT(t, 'runtime.videoToImageUnsupported');
  }

  return canvasT(t, 'runtime.connectionUnsupported');
}

function getCanvasMenuItems(
  t: CanvasTranslator,
  pendingConnection?: PendingCanvasConnection
): CanvasMenuItem[] {
  const baseItems: Record<CanvasNodeType, CanvasMenuItem> = {
    text: {
      nodeType: 'text',
      label: canvasT(t, 'common.textNode'),
      description: pendingConnection
        ? getCanvasConnectionDescription(t, pendingConnection, 'text')
        : undefined,
      icon: Type,
    },
    note: {
      nodeType: 'note',
      label: canvasT(t, 'common.noteNode'),
      description: pendingConnection
        ? getCanvasConnectionDescription(t, pendingConnection, 'note')
        : undefined,
      icon: StickyNote,
    },
    image: {
      nodeType: 'image',
      label: canvasT(t, 'common.imageNode'),
      description: pendingConnection
        ? getCanvasConnectionDescription(t, pendingConnection, 'image')
        : undefined,
      icon: ImageIcon,
    },
    video: {
      nodeType: 'video',
      label: canvasT(t, 'common.videoNode'),
      description: pendingConnection
        ? getCanvasConnectionDescription(t, pendingConnection, 'video')
        : undefined,
      icon: Video,
    },
    audio: {
      nodeType: 'audio',
      label: canvasT(t, 'common.audioNode'),
      description: pendingConnection
        ? getCanvasConnectionDescription(t, pendingConnection, 'audio')
        : undefined,
      icon: AudioLines,
    },
  };

  const orderedNodeTypes = getCanvasRecommendedNodeTypes(pendingConnection);

  return orderedNodeTypes.map((nodeType, index) => {
    const compatible = pendingConnection
      ? getCanvasMenuItemCompatibility(pendingConnection, nodeType)
      : true;

    return {
      ...baseItems[nodeType],
      recommended: index === 0,
      disabled: !compatible,
      disabledReason:
        pendingConnection && !compatible
          ? getCanvasConnectionDisabledReason(t, pendingConnection, nodeType)
          : undefined,
    };
  });
}

function getClientPoint(
  event: MouseEvent | TouchEvent,
  fallback?: { x: number; y: number }
) {
  if ('clientX' in event) {
    return {
      x: event.clientX,
      y: event.clientY,
    };
  }

  const touch = event.changedTouches[0] || event.touches[0];
  if (touch) {
    return {
      x: touch.clientX,
      y: touch.clientY,
    };
  }

  return fallback || { x: 0, y: 0 };
}

function getMediaInputMode(
  nodeData: CanvasImageNodeData | CanvasVideoNodeData | CanvasAudioNodeData
): CanvasMediaInputMode {
  return nodeData.inputMode === 'upload' ? 'upload' : 'generate';
}

function getCanvasReferenceToken(
  sourceNodeType: CanvasNodeType,
  counts: Record<CanvasNodeType, number>
) {
  counts[sourceNodeType] += 1;
  if (sourceNodeType === 'image') {
    return `@image${counts[sourceNodeType]}`;
  }
  if (sourceNodeType === 'video') {
    return `@video${counts[sourceNodeType]}`;
  }
  if (sourceNodeType === 'audio') {
    return `@audio${counts[sourceNodeType]}`;
  }
  return `@text${counts[sourceNodeType]}`;
}

function getCanvasReferenceItems(
  graph: ReturnType<typeof buildCanvasGraphFromFlow>,
  nodeId: string
): CanvasReferenceItem[] {
  const references: CanvasReferenceItem[] = [];
  const targetNode = getCanvasNodeById(graph, nodeId);
  const targetNodeData = targetNode
    ? normalizeCanvasNodeData(targetNode.type, targetNode.data)
    : null;
  const usesMidjourneyInputSemantics =
    targetNodeData?.nodeType === 'image' &&
    isMidjourneyCanvasImageModel(targetNodeData.model);
  const tokenCounts: Record<CanvasNodeType, number> = {
    text: 0,
    note: 0,
    image: 0,
    video: 0,
    audio: 0,
  };

  for (const edge of graph.edges) {
    if (edge.target !== nodeId) {
      continue;
    }

    const sourceNode = getCanvasNodeById(graph, edge.source);
    if (!sourceNode) {
      continue;
    }

    const sourceData = normalizeCanvasNodeData(
      sourceNode.type,
      sourceNode.data
    );
    references.push({
      edgeId: edge.id,
      sourceNodeId: sourceNode.id,
      sourceNodeType: sourceNode.type,
      kind:
        sourceNode.type === 'image'
          ? usesMidjourneyInputSemantics
            ? getCanvasReferenceKindFromHandle(edge.targetHandle)
            : 'default'
          : 'default',
      token: getCanvasReferenceToken(sourceNode.type, tokenCounts),
      title: sourceData.title,
      text:
        sourceData.nodeType === 'text'
          ? sourceData.plainText.trim() || sourceData.prompt.trim()
          : sourceData.nodeType === 'note'
            ? sourceData.noteHtml
                .replace(/<[^>]*>/g, ' ')
                .replace(/\s+/g, ' ')
                .trim()
            : undefined,
      media:
        sourceData.nodeType === 'image'
          ? sourceData.image
          : sourceData.nodeType === 'video'
            ? sourceData.video
            : sourceData.nodeType === 'audio'
              ? sourceData.audio
              : null,
    });
  }

  return references;
}

function getRequiredModelScene(
  nodeData: CanvasNodeData,
  references: CanvasReferenceItem[],
  candidateModel = nodeData.model
) {
  if (nodeData.nodeType === 'text' || nodeData.nodeType === 'note') {
    return null;
  }

  const hasVideoReference = references.some(
    (reference) => reference.sourceNodeType === 'video'
  );
  const imageReferences = references.filter(
    (reference) => reference.sourceNodeType === 'image'
  );
  const hasImageReference = imageReferences.length > 0;
  const hasMidjourneyPromptImageReference = imageReferences.some(
    (reference) =>
      reference.kind !== 'style-reference' &&
      reference.kind !== 'omni-reference'
  );

  const inputs = {
    textInputs: [],
    imageInputs:
      nodeData.nodeType === 'image' &&
      isMidjourneyCanvasImageModel(candidateModel)
        ? hasMidjourneyPromptImageReference
          ? [{ nodeId: 'ref-image', url: 'ref' }]
          : []
        : hasImageReference
          ? [{ nodeId: 'ref-image', url: 'ref' }]
          : [],
    styleReferenceInputs: [],
    omniReferenceInputs: [],
    videoInputs: hasVideoReference
      ? [{ nodeId: 'ref-video', url: 'ref-video' }]
      : [],
    audioInputs: [],
  };

  return inferCanvasExecutionScene(
    nodeData.nodeType,
    inputs,
    nodeData.nodeType === 'image' &&
      isMidjourneyCanvasImageModel(candidateModel)
      ? {
          ...nodeData,
          model: candidateModel,
        }
      : undefined
  ) as
    | 'text-to-image'
    | 'image-to-image'
    | 'text-to-video'
    | 'image-to-video'
    | 'video-to-video';
}

function isModelSelectableForNode(
  nodeData: CanvasNodeData,
  references: CanvasReferenceItem[],
  model: string
) {
  if (nodeData.nodeType === 'text' || nodeData.nodeType === 'note') {
    return true;
  }

  const modelOptions =
    nodeData.nodeType === 'image'
      ? IMAGE_MODEL_OPTIONS
      : nodeData.nodeType === 'audio'
        ? AUDIO_MODEL_OPTIONS
        : VIDEO_MODEL_OPTIONS;
  const modelInfo = modelOptions.find((item) => item.model === model);
  if (!modelInfo) {
    return false;
  }

  const requiredScene = getRequiredModelScene(nodeData, references);
  const candidateScene = getRequiredModelScene(nodeData, references, model);
  if (!requiredScene) {
    return true;
  }

  return modelInfo.supported_scenes.includes(candidateScene || requiredScene);
}

function renderNodePreview(
  t: CanvasTranslator,
  nodeId: string,
  data: CanvasNodeData,
  options?: {
    onPreviewImage?: (image: CanvasImagePreviewState) => void;
    expandedImagePickerNodeId?: string | null;
    onToggleImagePicker?: (nodeId: string) => void;
    onSelectImageOutput?: (nodeId: string, index: number) => void;
    onSelectVideoOutput?: (nodeId: string, index: number) => void;
  }
) {
  const onPreviewImage = options?.onPreviewImage;
  const displayTitle = localizeCanvasNodeTitle(t, data.nodeType, data.title);

  if (data.nodeType === 'text') {
    return data.plainText.trim() ? (
      <div className="max-h-[340px] min-h-[220px] cursor-grab overflow-y-auto rounded-[20px] border border-white/8 bg-white/[0.03] p-4 text-sm leading-6 text-white/82">
        <pre className="font-inherit break-words whitespace-pre-wrap">
          {data.plainText}
        </pre>
      </div>
    ) : (
      <div className="flex min-h-[220px] cursor-grab items-center justify-center rounded-[20px] border border-dashed border-white/12 bg-white/[0.03] p-4 text-center text-sm leading-6 text-white/42">
        {canvasT(t, 'studio.doubleClickTextNode')}
      </div>
    );
  }

  if (data.nodeType === 'note') {
    return data.noteHtml.trim() ? (
      <div
        className="canvas-note-content max-h-[340px] min-h-[180px] cursor-grab overflow-y-auto rounded-[18px] border border-amber-200/12 bg-amber-200/[0.06] p-4 text-sm leading-6 text-white/86"
        dangerouslySetInnerHTML={{
          __html: sanitizeCanvasNoteHtml(data.noteHtml),
        }}
      />
    ) : (
      <div className="flex min-h-[180px] cursor-grab items-center justify-center rounded-[18px] border border-dashed border-amber-200/18 bg-amber-200/[0.04] p-4 text-center text-sm leading-6 text-white/42">
        {canvasT(t, 'studio.doubleClickNoteNode')}
      </div>
    );
  }

  if (data.nodeType === 'image') {
    const imageOutputs = getCanvasImageOutputs(data);
    const selectedImageIndex = clampCanvasImageIndex(
      data.selectedImageIndex,
      imageOutputs.length
    );
    const primaryImage = imageOutputs[selectedImageIndex] || data.image;
    const hasMultipleOutputs = imageOutputs.length > 1;
    const isImagePickerExpanded =
      options?.expandedImagePickerNodeId === nodeId && hasMultipleOutputs;

    return primaryImage?.url ? (
      <div
        data-canvas-image-picker-root={hasMultipleOutputs ? 'true' : undefined}
        className="group/image-preview relative h-full cursor-grab overflow-hidden rounded-[20px] border border-white/8 bg-black"
      >
        <div className="absolute inset-0">
          <img
            src={primaryImage.thumbnailUrl || primaryImage.url}
            alt={displayTitle}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-black/0 transition group-hover/image-preview:bg-black/10" />
        </div>

        {hasMultipleOutputs ? (
          <select
            data-canvas-image-picker-root="true"
            value={String(selectedImageIndex)}
            onClick={(event) => event.stopPropagation()}
            onPointerDown={(event) => event.stopPropagation()}
            onChange={(event) => {
              event.stopPropagation();
              options?.onSelectImageOutput?.(
                nodeId,
                Number(event.target.value)
              );
            }}
            className="nodrag nopan absolute top-3 right-3 z-20 h-8 max-w-[116px] rounded-full border border-white/12 bg-black/78 px-2.5 text-xs font-medium text-white shadow-[0_12px_28px_rgba(0,0,0,0.38)] transition outline-none hover:border-white/30"
          >
            {imageOutputs.map((_, index) => (
              <option key={index} value={index}>
                {canvasT(t, 'studio.versionLabel', { index: index + 1 })}
              </option>
            ))}
          </select>
        ) : null}

        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onPreviewImage?.({
              images: imageOutputs,
              activeIndex: selectedImageIndex,
              title: displayTitle,
              nodeId,
            });
          }}
          className="absolute right-3 bottom-3 z-20 inline-flex size-9 items-center justify-center rounded-full border border-white/12 bg-black/72 text-white/70 opacity-0 shadow-[0_12px_32px_rgba(0,0,0,0.4)] transition-all duration-150 group-hover/image-preview:opacity-100 hover:border-white hover:bg-black hover:text-white"
        >
          <Expand className="size-4" />
        </button>

        {isImagePickerExpanded ? (
          <div
            data-canvas-image-picker-root="true"
            className="absolute inset-0 z-10 grid grid-cols-2 gap-1 bg-black/88 p-1.5 backdrop-blur-[2px]"
          >
            {imageOutputs.slice(0, 4).map((image, index) => (
              <button
                key={`${image.url}-${index}`}
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  options?.onSelectImageOutput?.(nodeId, index);
                }}
                className={cn(
                  'group/output-select relative overflow-hidden rounded-[14px] border border-transparent bg-black transition hover:border-white/30',
                  index === selectedImageIndex && 'border-white/55'
                )}
              >
                <img
                  src={image.thumbnailUrl || image.url}
                  alt={`${displayTitle} ${index + 1}`}
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover"
                />
                <div className="pointer-events-none absolute inset-0 bg-black/0 transition group-hover/output-select:bg-black/8" />
              </button>
            ))}
          </div>
        ) : null}
      </div>
    ) : (
      <div className="flex h-full min-h-[190px] cursor-grab items-center justify-center rounded-[20px] border border-dashed border-white/12 bg-white/[0.03] text-white/30">
        <ImagePlus className="size-14" />
      </div>
    );
  }

  if (data.nodeType === 'audio') {
    return data.audio?.url ? (
      <div className="cursor-grab rounded-[20px] border border-white/8 bg-white/[0.03] p-4">
        <div className="mb-3 flex items-center gap-3 text-white/80">
          <div className="flex size-12 items-center justify-center rounded-full border border-white/10 bg-white/5">
            <Headphones className="size-6" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">
              {canvasT(t, 'studio.audioReady')}
            </p>
            <p className="text-xs text-white/50">
              {data.audio.source === 'uploaded'
                ? canvasT(t, 'studio.audioUploaded')
                : canvasT(t, 'studio.audioGenerated')}
            </p>
          </div>
        </div>
        <audio src={data.audio.url} controls className="w-full" />
      </div>
    ) : (
      <div className="flex h-full min-h-[190px] cursor-grab items-center justify-center rounded-[20px] border border-dashed border-white/12 bg-white/[0.03] text-white/30">
        <AudioLines className="size-14" />
      </div>
    );
  }

  if (data.nodeType !== 'video') {
    return null;
  }

  const videoHistory = getCanvasVideoHistory(data);
  const selectedVideoIndex = clampCanvasImageIndex(
    data.selectedVideoIndex,
    videoHistory.length
  );
  const primaryVideo = videoHistory[selectedVideoIndex] || data.video;
  const hasMultipleVideos = videoHistory.length > 1;

  return primaryVideo?.url ? (
    <div className="relative h-full cursor-grab overflow-hidden rounded-[20px] border border-white/8 bg-black">
      <LazyVideo
        src={primaryVideo.url}
        controls
        muted
        playsInline
        loadStrategy="idle-visible"
        onDoubleClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
        }}
        className="h-full w-full object-cover"
      />
      {hasMultipleVideos ? (
        <select
          value={String(selectedVideoIndex)}
          onClick={(event) => event.stopPropagation()}
          onPointerDown={(event) => event.stopPropagation()}
          onChange={(event) => {
            event.stopPropagation();
            options?.onSelectVideoOutput?.(nodeId, Number(event.target.value));
          }}
          className="nodrag nopan absolute top-3 right-3 z-20 h-8 max-w-[116px] rounded-full border border-white/12 bg-black/78 px-2.5 text-xs font-medium text-white shadow-[0_12px_28px_rgba(0,0,0,0.38)] transition outline-none hover:border-white/30"
        >
          {videoHistory.map((_, index) => (
            <option key={index} value={index}>
              {canvasT(t, 'studio.versionLabel', { index: index + 1 })}
            </option>
          ))}
        </select>
      ) : null}
    </div>
  ) : (
    <div className="flex h-full min-h-[190px] cursor-grab items-center justify-center rounded-[20px] border border-dashed border-white/12 bg-white/[0.03] text-white/30">
      <ListVideo className="size-14" />
    </div>
  );
}

function getAspectRatioCssValue(value: string | null | undefined) {
  if (!value) {
    return '1 / 1';
  }

  const [width, height] = value.split(':');
  const widthNumber = Number(width);
  const heightNumber = Number(height);

  if (
    Number.isFinite(widthNumber) &&
    widthNumber > 0 &&
    Number.isFinite(heightNumber) &&
    heightNumber > 0
  ) {
    return `${widthNumber} / ${heightNumber}`;
  }

  return '1 / 1';
}

function getCanvasPointerPosition(
  canvas: HTMLCanvasElement,
  event: React.PointerEvent<HTMLCanvasElement>
) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;

  return {
    x: (event.clientX - rect.left) * scaleX,
    y: (event.clientY - rect.top) * scaleY,
  };
}

const IMAGE_EDITOR_MAX_DIMENSION = 4096;
const IMAGE_EDITOR_MAX_PIXELS = 16_000_000;
const IMAGE_EDITOR_FETCH_TIMEOUT_MS = 20_000;

function getImageEditorCanvasSize(width: number, height: number) {
  const safeWidth = Math.max(1, width);
  const safeHeight = Math.max(1, height);
  const scale = Math.min(
    1,
    IMAGE_EDITOR_MAX_DIMENSION / safeWidth,
    IMAGE_EDITOR_MAX_DIMENSION / safeHeight,
    Math.sqrt(IMAGE_EDITOR_MAX_PIXELS / (safeWidth * safeHeight))
  );

  return {
    width: Math.max(1, Math.round(safeWidth * scale)),
    height: Math.max(1, Math.round(safeHeight * scale)),
  };
}

function getImageEditorUrlCandidates(media: CanvasNodeMedia) {
  const sourceUrls = [media.url, media.thumbnailUrl]
    .map((url) => String(url || '').trim())
    .filter(Boolean);
  const uniqueSourceUrls = Array.from(new Set(sourceUrls));

  return Array.from(
    new Set(
      uniqueSourceUrls.flatMap((url) => {
        if (url.startsWith('/api/proxy/file?')) {
          return [url];
        }

        const proxyUrl = `/api/proxy/file?url=${encodeURIComponent(url)}`;
        try {
          const parsedUrl = new URL(url, window.location.href);
          if (parsedUrl.origin === window.location.origin) {
            return [url, proxyUrl];
          }
        } catch {
          return [url];
        }

        return [proxyUrl, url];
      })
    )
  );
}

async function fetchImageEditorBlob(media: CanvasNodeMedia) {
  const candidates = getImageEditorUrlCandidates(media);
  let lastError: unknown = null;

  for (const candidate of candidates) {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(
      () => controller.abort(),
      IMAGE_EDITOR_FETCH_TIMEOUT_MS
    );

    try {
      const response = await fetch(candidate, {
        cache: 'no-store',
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new Error(`request failed with status ${response.status}`);
      }

      const blob = await response.blob();
      if (!blob.type.startsWith('image/')) {
        throw new Error('response is not an image');
      }

      return blob;
    } catch (error) {
      console.warn('canvas image editor source candidate failed', {
        url: candidate,
        error,
      });
      lastError = error;
    } finally {
      window.clearTimeout(timeoutId);
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error('Image could not be loaded for editing.');
}

async function drawBlobToEditorCanvas({
  blob,
  canvas,
  context,
}: {
  blob: Blob;
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
}) {
  if ('createImageBitmap' in window) {
    try {
      const bitmap = await createImageBitmap(blob);
      const { width, height } = getImageEditorCanvasSize(
        bitmap.width,
        bitmap.height
      );
      canvas.width = width;
      canvas.height = height;
      context.clearRect(0, 0, width, height);
      context.drawImage(bitmap, 0, 0, width, height);
      bitmap.close();
      return;
    } catch (error) {
      console.warn('createImageBitmap failed for canvas editor image', error);
    }
  }

  const objectUrl = URL.createObjectURL(blob);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error('image decode failed'));
      element.src = objectUrl;
    });
    const { width, height } = getImageEditorCanvasSize(
      image.naturalWidth || image.width,
      image.naturalHeight || image.height
    );
    canvas.width = width;
    canvas.height = height;
    context.clearRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function CanvasImageEditorDialog({
  open,
  state,
  onOpenChange,
  onSave,
}: {
  open: boolean;
  state: CanvasImageEditorState | null;
  onOpenChange: (open: boolean) => void;
  onSave: (payload: CanvasImageEditorSavePayload) => void;
}) {
  const t = useCanvasTranslations();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const historyRef = useRef<ImageData[]>([]);
  const historyIndexRef = useRef(-1);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const [color, setColor] = useState('#ff3b30');
  const [brushSize, setBrushSize] = useState(18);
  const [opacity, setOpacity] = useState(0.82);
  const [isDrawing, setIsDrawing] = useState(false);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [historyLength, setHistoryLength] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isDismissedAfterSave, setIsDismissedAfterSave] = useState(false);
  const [canvasElement, setCanvasElement] = useState<HTMLCanvasElement | null>(
    null
  );
  const isDialogOpen = open && !isDismissedAfterSave;

  const setEditorCanvasRef = useCallback(
    (element: HTMLCanvasElement | null) => {
      canvasRef.current = element;
      setCanvasElement(element);
    },
    []
  );

  useEffect(() => {
    if (state?.sessionId) {
      setIsDismissedAfterSave(false);
    }
  }, [state?.sessionId]);

  const syncHistoryState = useCallback(() => {
    setHistoryIndex(historyIndexRef.current);
    setHistoryLength(historyRef.current.length);
  }, []);

  const captureSnapshot = useCallback(() => {
    const canvas = canvasRef.current;
    const context = contextRef.current;
    if (!canvas || !context || canvas.width <= 0 || canvas.height <= 0) {
      return;
    }

    try {
      const snapshot = context.getImageData(0, 0, canvas.width, canvas.height);
      const nextHistory = historyRef.current.slice(
        0,
        historyIndexRef.current + 1
      );
      nextHistory.push(snapshot);
      historyRef.current = nextHistory.slice(-40);
      historyIndexRef.current = historyRef.current.length - 1;
      syncHistoryState();
    } catch (error) {
      console.error('capture canvas edit history failed', error);
    }
  }, [syncHistoryState]);

  const applySnapshot = useCallback(
    (index: number) => {
      const canvas = canvasRef.current;
      const context = contextRef.current;
      const snapshot = historyRef.current[index];
      if (!canvas || !context || !snapshot) {
        return;
      }

      context.putImageData(snapshot, 0, 0);
      historyIndexRef.current = index;
      syncHistoryState();
    },
    [syncHistoryState]
  );

  useEffect(() => {
    if (!isDialogOpen || !state?.media.url) {
      return;
    }

    const canvas = canvasElement;
    const context = canvas?.getContext('2d', { willReadFrequently: true });
    if (!canvas || !context) {
      return;
    }

    let canceled = false;
    setIsLoading(true);
    setLoadError(null);
    historyRef.current = [];
    historyIndexRef.current = -1;
    syncHistoryState();

    const loadImage = async () => {
      try {
        const blob = await fetchImageEditorBlob(state.media);
        if (canceled) {
          return;
        }

        await drawBlobToEditorCanvas({ blob, canvas, context });

        if (canceled) {
          return;
        }

        contextRef.current = context;
        setIsLoading(false);
        captureSnapshot();
      } catch (error) {
        if (canceled) {
          return;
        }
        console.error('load canvas image editor source failed', error);
        setIsLoading(false);
        setLoadError('Image could not be loaded for editing.');
      }
    };

    void loadImage();

    return () => {
      canceled = true;
    };
  }, [
    captureSnapshot,
    canvasElement,
    isDialogOpen,
    state?.media.thumbnailUrl,
    state?.media.url,
    syncHistoryState,
  ]);

  const beginStroke = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const context = contextRef.current;
    if (!canvas || !context || isLoading || loadError) {
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    const point = getCanvasPointerPosition(canvas, event);
    context.beginPath();
    context.moveTo(point.x, point.y);
    lastPointRef.current = point;
    setIsDrawing(true);
  };

  const continueStroke = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const context = contextRef.current;
    const lastPoint = lastPointRef.current;
    if (!canvas || !context || !isDrawing || !lastPoint) {
      return;
    }

    const point = getCanvasPointerPosition(canvas, event);
    context.globalAlpha = opacity;
    context.strokeStyle = color;
    context.lineWidth = brushSize;
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.beginPath();
    context.moveTo(lastPoint.x, lastPoint.y);
    context.lineTo(point.x, point.y);
    context.stroke();
    context.globalAlpha = 1;
    lastPointRef.current = point;
  };

  const finishStroke = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) {
      return;
    }

    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // Pointer capture may already be released by the browser.
    }
    setIsDrawing(false);
    lastPointRef.current = null;
    captureSnapshot();
  };

  const handleUndo = () => {
    if (historyIndexRef.current <= 0) {
      return;
    }
    applySnapshot(historyIndexRef.current - 1);
  };

  const handleRedo = () => {
    if (historyIndexRef.current >= historyRef.current.length - 1) {
      return;
    }
    applySnapshot(historyIndexRef.current + 1);
  };

  const handleRestore = () => {
    if (historyRef.current.length === 0) {
      return;
    }
    applySnapshot(0);
    historyRef.current = historyRef.current.slice(0, 1);
    historyIndexRef.current = 0;
    syncHistoryState();
  };

  const handleSave = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !state || isSaving) {
      return;
    }

    const startedAt = performance.now();
    const logTiming = (step: string, stepStartedAt: number) => {
      const now = performance.now();
      console.info('[canvas:image-editor:save]', {
        step,
        stepMs: Math.round(now - stepStartedAt),
        totalMs: Math.round(now - startedAt),
        canvasWidth: canvas.width,
        canvasHeight: canvas.height,
      });
      return now;
    };

    try {
      setIsSaving(true);
      const stepStartedAt = performance.now();
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (result) => {
            if (result) {
              resolve(result);
            } else {
              reject(new Error('Failed to export edited image.'));
            }
          },
          'image/jpeg',
          0.92
        );
      });
      const exportedAt = logTiming('export_jpeg', stepStartedAt);
      const safeTitle = state.title.replace(/[^a-z0-9_-]+/gi, '-').slice(0, 48);
      const file = new File([blob], `${safeTitle || 'canvas-image'}-edit.jpg`, {
        type: 'image/jpeg',
      });
      const payload = {
        file,
        startedAt,
        exportedAt,
        canvasWidth: canvas.width,
        canvasHeight: canvas.height,
      };
      setIsDismissedAfterSave(true);
      onOpenChange(false);
      onSave(payload);
      toast.success('Image edit is uploading.');
    } catch (error) {
      console.error('save canvas image edit failed', error);
      toast.error(
        error instanceof Error
          ? translateCanvasRuntimeMessage(t, error.message, '图片保存失败。')
          : '图片保存失败。'
      );
    } finally {
      setIsSaving(false);
    }
  };

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex >= 0 && historyIndex < historyLength - 1;

  if (!isDialogOpen) {
    return null;
  }

  return (
    <Dialog
      open={isDialogOpen}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          setIsDismissedAfterSave(true);
        }
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent
        showCloseButton={false}
        fullScreen
        className="bg-[#080808] p-0 text-white"
      >
        <DialogTitle className="sr-only">
          {state?.title || 'Image editor'}
        </DialogTitle>
        <div className="flex h-full min-h-0 flex-col">
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-[#101010]/96 px-4 py-3 sm:px-5">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-white/88">
                {state?.title || 'Image editor'}
              </p>
              <p className="text-xs text-white/45">Draw on the image</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleUndo}
                disabled={!canUndo || isSaving || isLoading}
                className="border-white/12 bg-white/[0.04] text-white hover:bg-white/10 hover:text-white"
              >
                <Undo2 className="size-4" />
                Undo
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleRedo}
                disabled={!canRedo || isSaving || isLoading}
                className="border-white/12 bg-white/[0.04] text-white hover:bg-white/10 hover:text-white"
              >
                <Redo2 className="size-4" />
                Redo
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleRestore}
                disabled={historyLength <= 1 || isSaving || isLoading}
                className="border-white/12 bg-white/[0.04] text-white hover:bg-white/10 hover:text-white"
              >
                <RotateCcw className="size-4" />
                Restore
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => void handleSave()}
                disabled={isSaving || isLoading || Boolean(loadError)}
                className="bg-white text-black hover:bg-white/90"
              >
                {isSaving ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <Save className="size-4" />
                )}
                Save
              </Button>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={() => onOpenChange(false)}
                className="rounded-full text-white/65 hover:bg-white/10 hover:text-white"
              >
                <X className="size-4" />
              </Button>
            </div>
          </div>

          <div className="grid min-h-0 flex-1 lg:grid-cols-[220px_minmax(0,1fr)]">
            <div className="border-b border-white/10 bg-[#111111] p-4 lg:border-r lg:border-b-0">
              <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
                <div className="space-y-2">
                  <Label className="text-xs tracking-[0.2em] text-white/45 uppercase">
                    Color
                  </Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={color}
                      onChange={(event) => setColor(event.target.value)}
                      className="h-10 w-12 cursor-pointer rounded-lg border border-white/12 bg-transparent p-1"
                    />
                    <Input
                      value={color}
                      onChange={(event) => setColor(event.target.value)}
                      className="border-white/10 bg-white/[0.04] text-white"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs tracking-[0.2em] text-white/45 uppercase">
                    Brush
                  </Label>
                  <Input
                    type="range"
                    min={1}
                    max={80}
                    step={1}
                    value={brushSize}
                    onChange={(event) =>
                      setBrushSize(Number(event.target.value))
                    }
                    className="accent-white"
                  />
                  <p className="text-xs text-white/55">{brushSize}px</p>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs tracking-[0.2em] text-white/45 uppercase">
                    Opacity
                  </Label>
                  <Input
                    type="range"
                    min={0.05}
                    max={1}
                    step={0.05}
                    value={opacity}
                    onChange={(event) => setOpacity(Number(event.target.value))}
                    className="accent-white"
                  />
                  <p className="text-xs text-white/55">
                    {Math.round(opacity * 100)}%
                  </p>
                </div>
              </div>
            </div>

            <div className="relative min-h-[420px] overflow-hidden bg-black lg:min-h-0">
              {isLoading ? (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/70">
                  <LoaderCircle className="size-6 animate-spin text-white" />
                </div>
              ) : null}
              {loadError ? (
                <div className="absolute inset-0 z-10 flex items-center justify-center p-6 text-center text-sm text-rose-100">
                  {loadError}
                </div>
              ) : null}
              <div className="flex h-full min-h-0 items-center justify-center overflow-auto p-4">
                <canvas
                  ref={setEditorCanvasRef}
                  onPointerDown={beginStroke}
                  onPointerMove={continueStroke}
                  onPointerUp={finishStroke}
                  onPointerCancel={finishStroke}
                  className="max-h-full max-w-full touch-none rounded-lg bg-black shadow-[0_20px_70px_rgba(0,0,0,0.5)]"
                  style={{
                    cursor: 'crosshair',
                    display: 'block',
                    height: 'auto',
                    width: 'auto',
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function areCanvasValuesEqual(left: unknown, right: unknown) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function mergeCanvasNodeForRevision({
  baseNode,
  localNode,
  remoteNode,
}: {
  baseNode: SerializedCanvasNode | null;
  localNode: SerializedCanvasNode;
  remoteNode: SerializedCanvasNode | null;
}): SerializedCanvasNode {
  if (!baseNode || !remoteNode) {
    return localNode;
  }

  const baseData = normalizeCanvasNodeData(baseNode.type, baseNode.data);
  const localData = normalizeCanvasNodeData(localNode.type, localNode.data);
  const remoteData = normalizeCanvasNodeData(remoteNode.type, remoteNode.data);
  const nextData: Record<string, unknown> = {};
  const keys = new Set([
    ...Object.keys(baseData),
    ...Object.keys(localData),
    ...Object.keys(remoteData),
  ]);

  for (const key of keys) {
    const baseValue = (baseData as Record<string, unknown>)[key];
    const localValue = (localData as Record<string, unknown>)[key];
    const remoteValue = (remoteData as Record<string, unknown>)[key];
    nextData[key] = areCanvasValuesEqual(localValue, baseValue)
      ? remoteValue
      : localValue;
  }

  return {
    ...remoteNode,
    position: areCanvasValuesEqual(localNode.position, baseNode.position)
      ? remoteNode.position
      : localNode.position,
    width:
      localNode.width === baseNode.width ? remoteNode.width : localNode.width,
    height:
      localNode.height === baseNode.height
        ? remoteNode.height
        : localNode.height,
    data: normalizeCanvasNodeData(remoteNode.type, nextData),
  };
}

function rebaseCanvasGraphEdits({
  baseGraph,
  localGraph,
  remoteGraph,
}: {
  baseGraph: SerializedCanvasGraph;
  localGraph: SerializedCanvasGraph;
  remoteGraph: SerializedCanvasGraph;
}): SerializedCanvasGraph {
  const baseNodesById = new Map(baseGraph.nodes.map((node) => [node.id, node]));
  const localNodesById = new Map(
    localGraph.nodes.map((node) => [node.id, node] as const)
  );
  const remoteNodesById = new Map(
    remoteGraph.nodes.map((node) => [node.id, node] as const)
  );
  const nextNodes: SerializedCanvasNode[] = [];

  for (const remoteNode of remoteGraph.nodes) {
    const localNode = localNodesById.get(remoteNode.id);
    const baseNode = baseNodesById.get(remoteNode.id) || null;

    if (!localNode) {
      if (!baseNode) {
        nextNodes.push(remoteNode);
      }
      continue;
    }

    nextNodes.push(
      mergeCanvasNodeForRevision({
        baseNode,
        localNode,
        remoteNode,
      })
    );
  }

  for (const localNode of localGraph.nodes) {
    if (!remoteNodesById.has(localNode.id)) {
      nextNodes.push(
        mergeCanvasNodeForRevision({
          baseNode: baseNodesById.get(localNode.id) || null,
          localNode,
          remoteNode: remoteNodesById.get(localNode.id) || null,
        })
      );
    }
  }

  return {
    version: 1,
    viewport: areCanvasValuesEqual(localGraph.viewport, baseGraph.viewport)
      ? remoteGraph.viewport
      : localGraph.viewport,
    nodes: nextNodes,
    edges: areCanvasValuesEqual(localGraph.edges, baseGraph.edges)
      ? remoteGraph.edges
      : localGraph.edges,
  };
}

function quoteCanvasNodeCredits(
  nodeData: CanvasImageNodeData | CanvasVideoNodeData | CanvasAudioNodeData,
  inputs: ReturnType<typeof resolveCanvasNodeInputs>
) {
  const mediaType =
    nodeData.nodeType === 'image'
      ? AIMediaType.IMAGE
      : nodeData.nodeType === 'audio'
        ? AIMediaType.AUDIO
        : AIMediaType.VIDEO;
  const scene = inferCanvasExecutionScene(nodeData.nodeType, inputs, nodeData);
  const options: Record<string, unknown> =
    nodeData.nodeType === 'image'
      ? isMidjourneyCanvasImageModel(nodeData.model)
        ? {
            aspect_ratio: nodeData.aspectRatio,
            image_input: inputs.imageInputs.map((item) => item.url),
            style_reference_input: inputs.styleReferenceInputs.map(
              (item) => item.url
            ),
            omni_reference_input: inputs.omniReferenceInputs.map(
              (item) => item.url
            ),
            image_weight: nodeData.imageWeight,
            style_reference_weight: nodeData.styleReferenceWeight,
            omni_reference_weight: nodeData.omniReferenceWeight,
          }
        : {
            aspect_ratio: nodeData.aspectRatio,
            resolution: nodeData.resolution,
            image_input: [
              ...inputs.imageInputs,
              ...inputs.styleReferenceInputs,
              ...inputs.omniReferenceInputs,
            ].map((item) => item.url),
          }
      : nodeData.nodeType === 'audio'
        ? {
            soundLoop: nodeData.soundLoop,
            soundTempo: nodeData.soundTempo,
            soundKey: nodeData.soundKey,
          }
        : {
            aspect_ratio: nodeData.aspectRatio,
            resolution: nodeData.resolution,
            duration: nodeData.duration,
            seedance_mode:
              scene === 'image-to-video' &&
              isKieSeedanceCanvasVideoModel(nodeData.model)
                ? nodeData.referenceMode
                : undefined,
            ark_mode:
              scene === 'image-to-video' &&
              isArkCanvasVideoModel(nodeData.model)
                ? nodeData.referenceMode
                : undefined,
            image_input: inputs.imageInputs.map((item) => item.url),
            video_input: inputs.videoInputs.map((item) => item.url),
            audio_input: inputs.audioInputs.map((item) => item.url),
          };

  if (!Array.isArray(options.image_input) || options.image_input.length === 0) {
    delete options.image_input;
  }
  if ('style_reference_input' in options) {
    const styleReferenceInput = options.style_reference_input;
    if (
      !Array.isArray(styleReferenceInput) ||
      styleReferenceInput.length === 0
    ) {
      delete options.style_reference_input;
      delete options.style_reference_weight;
    }
  }
  if ('omni_reference_input' in options) {
    const omniReferenceInput = options.omni_reference_input;
    if (!Array.isArray(omniReferenceInput) || omniReferenceInput.length === 0) {
      delete options.omni_reference_input;
      delete options.omni_reference_weight;
    }
  }
  if (
    typeof options.image_weight !== 'string' ||
    options.image_weight.trim().length === 0
  ) {
    delete options.image_weight;
  }
  if (
    typeof options.style_reference_weight !== 'string' ||
    options.style_reference_weight.trim().length === 0
  ) {
    delete options.style_reference_weight;
  }
  if (
    typeof options.omni_reference_weight !== 'string' ||
    options.omni_reference_weight.trim().length === 0
  ) {
    delete options.omni_reference_weight;
  }
  if ('video_input' in options) {
    const videoInput = options.video_input;
    if (!Array.isArray(videoInput) || videoInput.length === 0) {
      delete options.video_input;
    }
  }
  if (
    typeof options.seedance_mode !== 'string' ||
    options.seedance_mode.trim().length === 0
  ) {
    delete options.seedance_mode;
  }
  if (
    typeof options.ark_mode !== 'string' ||
    options.ark_mode.trim().length === 0
  ) {
    delete options.ark_mode;
  }
  if ('audio_input' in options) {
    const audioInput = options.audio_input;
    if (!Array.isArray(audioInput) || audioInput.length === 0) {
      delete options.audio_input;
    }
  }

  const resolvedRoute = resolvePublicModelRoute({
    publicModel: nodeData.model,
    mediaType,
    scene,
    options,
  });

  const quotedModel = resolvedRoute.ok ? resolvedRoute.model : nodeData.model;
  const quotedScene = resolvedRoute.ok ? resolvedRoute.scene : scene;
  const quotedOptions = resolvedRoute.ok ? resolvedRoute.options : options;

  return quoteAICredits({
    mediaType,
    model: quotedModel,
    scene: quotedScene,
    options: quotedOptions,
  });
}

function renderReferencePreview(
  reference: CanvasReferenceItem,
  onPreviewImage?: (image: CanvasImagePreviewState) => void,
  options?: {
    hideExpandAction?: boolean;
  }
) {
  if (reference.sourceNodeType === 'text') {
    return (
      <div className="flex h-full items-center justify-center border border-white/8 bg-white/[0.04] p-3 text-center text-[11px] leading-4 text-white/65">
        <span className="line-clamp-4 break-words">
          {reference.text || reference.title}
        </span>
      </div>
    );
  }

  if (reference.media?.url) {
    if (reference.sourceNodeType === 'audio') {
      return (
        <div className="flex h-full items-center justify-center bg-white/[0.04] text-white/70">
          <Headphones className="size-5" />
        </div>
      );
    }

    if (reference.sourceNodeType === 'image') {
      return (
        <div className="group/image-preview relative h-full w-full">
          <img
            src={reference.media.thumbnailUrl || reference.media.url}
            alt={reference.title}
            className="h-full w-full object-cover"
          />
          {!options?.hideExpandAction ? (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onPreviewImage?.({
                  images: [reference.media!],
                  activeIndex: 0,
                  title: reference.title,
                });
              }}
              className="absolute right-2 bottom-2 inline-flex size-7 items-center justify-center rounded-full border border-white/12 bg-black/72 text-white/70 opacity-0 shadow-[0_10px_24px_rgba(0,0,0,0.38)] transition-all duration-150 group-hover/image-preview:opacity-100 hover:border-white hover:bg-black hover:text-white"
            >
              <Expand className="size-3.5" />
            </button>
          ) : null}
        </div>
      );
    }

    return (
      <video
        src={reference.media.url}
        muted
        playsInline
        preload="metadata"
        className="h-full w-full object-cover"
      />
    );
  }

  return (
    <div className="flex h-full items-center justify-center bg-white/[0.04] text-xs text-white/45">
      <ImagePlus className="size-4" />
    </div>
  );
}

function CanvasReferenceCard({
  reference,
  onPreviewImage,
  onInsertToken,
  onRemove,
  disableTokenInsert = false,
}: {
  reference: CanvasReferenceItem;
  onPreviewImage: (image: CanvasImagePreviewState) => void;
  onInsertToken: (token: string) => void;
  onRemove: (edgeId: string) => void;
  disableTokenInsert?: boolean;
}) {
  const locale = useCanvasLocale();
  const t = useCanvasTranslations();
  const tokenLabel =
    reference.sourceNodeType === 'audio'
      ? canvasT(t, 'common.audioNodeLabel')
      : reference.token;
  const canInsertToken =
    !disableTokenInsert && reference.sourceNodeType !== 'audio';
  const renderCompactReferenceContent = () => {
    if (reference.sourceNodeType === 'audio') {
      return (
        <div className="flex h-full items-center justify-center bg-white/[0.04] text-white/70">
          <Headphones className="size-4" />
        </div>
      );
    }

    if (reference.sourceNodeType === 'text') {
      return (
        <div className="flex h-full items-center justify-center bg-white/[0.04] px-1.5 text-center text-[9px] leading-3 text-white/60">
          <span className="line-clamp-2 break-words">
            {reference.text || reference.title}
          </span>
        </div>
      );
    }

    if (reference.media?.thumbnailUrl || reference.media?.url) {
      if (reference.sourceNodeType === 'image') {
        return (
          <img
            src={reference.media.thumbnailUrl || reference.media.url}
            alt={reference.title}
            className="h-full w-full object-cover"
          />
        );
      }

      return (
        <video
          src={reference.media.url}
          muted
          playsInline
          preload="metadata"
          className="h-full w-full object-cover"
        />
      );
    }

    return (
      <div className="flex h-full items-center justify-center bg-white/[0.04] text-white/45">
        <ImagePlus className="size-4" />
      </div>
    );
  };

  return (
    <HoverCard openDelay={80} closeDelay={120}>
      <HoverCardTrigger asChild>
        <div className="h-10 w-12 shrink-0 overflow-hidden rounded-[14px] border border-white/10 bg-black/40">
          {renderCompactReferenceContent()}
        </div>
      </HoverCardTrigger>
      <HoverCardContent
        side="top"
        align="center"
        sideOffset={10}
        className="z-[140] w-44 rounded-[18px] border-white/10 bg-[#111111]/98 p-2 text-white shadow-[0_24px_70px_rgba(0,0,0,0.5)] backdrop-blur"
      >
        <div className="mb-2 flex items-center justify-between gap-2">
          {canInsertToken ? (
            <button
              type="button"
              onClick={() => onInsertToken(reference.token)}
              className="rounded-full border border-white/12 bg-black/70 px-2 py-1 text-[10px] font-medium text-white/90 transition hover:bg-black"
            >
              {tokenLabel}
            </button>
          ) : (
            <span className="rounded-full border border-white/12 bg-black/70 px-2 py-1 text-[10px] font-medium text-white/90">
              {reference.sourceNodeType === 'image'
                ? canvasT(t, 'studio.imageReference')
                : tokenLabel}
            </span>
          )}
          <span className="rounded-full border border-white/12 bg-white/[0.06] px-2 py-1 text-[10px] font-medium text-white/72">
            {getCanvasReferenceKindLabel(t, reference.kind)}
          </span>
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={() => onRemove(reference.edgeId)}
            className="size-6 shrink-0 rounded-full border border-white/10 bg-black/60 text-white/70 hover:bg-black hover:text-white"
          >
            <X className="size-3.5" />
          </Button>
        </div>
        <div className="overflow-hidden rounded-[14px] border border-white/8 bg-black/60">
          <div className="h-[104px]">
            {renderReferencePreview(reference, onPreviewImage, {
              hideExpandAction: true,
            })}
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}

function CanvasReferencesRail({
  references,
  onPreviewImage,
  onInsertToken,
  onRemove,
  disableImageTokens = false,
}: {
  references: CanvasReferenceItem[];
  onPreviewImage: (image: CanvasImagePreviewState) => void;
  onInsertToken: (token: string) => void;
  onRemove: (edgeId: string) => void;
  disableImageTokens?: boolean;
}) {
  if (references.length === 0) {
    return null;
  }

  return (
    <div className="-my-3 flex min-h-10 items-center gap-2 overflow-x-auto overflow-y-visible py-4">
      {references.map((reference) => (
        <CanvasReferenceCard
          key={reference.edgeId}
          reference={reference}
          onPreviewImage={onPreviewImage}
          onInsertToken={onInsertToken}
          onRemove={onRemove}
          disableTokenInsert={
            disableImageTokens && reference.sourceNodeType === 'image'
          }
        />
      ))}
    </div>
  );
}

function CanvasMidjourneyWeightField({
  label,
  value,
  max,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  max: number;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-white/68">{label}</span>
        <span className="text-xs text-white/42">{value || '0'}</span>
      </div>
      <div className="grid gap-2">
        <input
          aria-label={label}
          type="range"
          min="0"
          max={String(max)}
          step={String(MIDJOURNEY_WEIGHT_STEP)}
          value={String(getCanvasMidjourneyWeightSliderValue(value, max))}
          onChange={(event) => onChange(event.target.value)}
          className="h-2 w-full cursor-pointer appearance-none rounded-full bg-white/18 accent-white [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-white [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
        />
        <Input
          type="number"
          min="0"
          max={String(max)}
          step={String(MIDJOURNEY_WEIGHT_STEP)}
          inputMode="decimal"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="border-white/10 bg-white/[0.04] text-white placeholder:text-white/28"
        />
      </div>
    </div>
  );
}

function CanvasMjReferenceAssignments({
  references,
  onAssignReference,
  imageWeight,
  styleReferenceWeight,
  omniReferenceWeight,
  onImageWeightChange,
  onStyleReferenceWeightChange,
  onOmniReferenceWeightChange,
}: {
  references: CanvasReferenceItem[];
  onAssignReference: (edgeId: string, kind: CanvasReferenceKind) => void;
  imageWeight: string;
  styleReferenceWeight: string;
  omniReferenceWeight: string;
  onImageWeightChange: (value: string) => void;
  onStyleReferenceWeightChange: (value: string) => void;
  onOmniReferenceWeightChange: (value: string) => void;
}) {
  const locale = useCanvasLocale();
  const t = useCanvasTranslations();
  const [draggingEdgeId, setDraggingEdgeId] = useState<string | null>(null);
  const [dropTargetKind, setDropTargetKind] =
    useState<CanvasReferenceKind | null>(null);
  const zones: Array<{
    kind: CanvasReferenceKind;
    label: string;
    weightLabel: string;
    weightValue: string;
    weightPlaceholder: string;
    weightMax: number;
    onWeightChange: (value: string) => void;
  }> = [
    {
      kind: 'image-prompts',
      label: canvasT(t, 'studio.imagePrompts'),
      weightLabel: canvasT(t, 'studio.imageWeight'),
      weightValue: imageWeight,
      weightPlaceholder: '0-3',
      weightMax: MIDJOURNEY_IMAGE_WEIGHT_MAX,
      onWeightChange: onImageWeightChange,
    },
    {
      kind: 'style-reference',
      label: canvasT(t, 'studio.styleReference'),
      weightLabel: canvasT(t, 'studio.styleWeight'),
      weightValue: styleReferenceWeight,
      weightPlaceholder: canvasT(t, 'studio.example100'),
      weightMax: MIDJOURNEY_REFERENCE_WEIGHT_SLIDER_MAX,
      onWeightChange: onStyleReferenceWeightChange,
    },
    {
      kind: 'omni-reference',
      label: canvasT(t, 'studio.omniReference'),
      weightLabel: canvasT(t, 'studio.omniWeight'),
      weightValue: omniReferenceWeight,
      weightPlaceholder: canvasT(t, 'studio.example100'),
      weightMax: MIDJOURNEY_REFERENCE_WEIGHT_SLIDER_MAX,
      onWeightChange: onOmniReferenceWeightChange,
    },
  ];

  const handleDragStart = (
    event: React.DragEvent<HTMLButtonElement>,
    edgeId: string
  ) => {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', edgeId);
    setDraggingEdgeId(edgeId);
  };

  const handleDrop = (
    event: React.DragEvent<HTMLDivElement>,
    kind: CanvasReferenceKind
  ) => {
    event.preventDefault();
    const edgeId =
      event.dataTransfer.getData('text/plain') || draggingEdgeId || '';
    if (edgeId) {
      onAssignReference(edgeId, kind);
    }
    setDraggingEdgeId(null);
    setDropTargetKind(null);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-xs tracking-[0.2em] text-white/45 uppercase">
          {canvasT(t, 'studio.references')}
        </Label>
        <span className="text-[11px] text-white/42">
          {canvasT(t, 'studio.dragBetweenZones')}
        </span>
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        {zones.map((zone) => {
          const zoneReferences = references.filter(
            (reference) =>
              normalizeMjReferenceZoneKind(reference.kind) === zone.kind
          );

          return (
            <div
              key={zone.kind}
              onDragOver={(event) => {
                event.preventDefault();
                event.dataTransfer.dropEffect = 'move';
              }}
              onDragEnter={(event) => {
                event.preventDefault();
                setDropTargetKind(zone.kind);
              }}
              onDragLeave={(event) => {
                if (
                  event.currentTarget.contains(
                    event.relatedTarget as Node | null
                  )
                ) {
                  return;
                }
                setDropTargetKind((current) =>
                  current === zone.kind ? null : current
                );
              }}
              onDrop={(event) => handleDrop(event, zone.kind)}
              className={cn(
                'rounded-[18px] border border-white/10 bg-black/35 p-3 transition',
                dropTargetKind === zone.kind &&
                  'border-white/30 bg-white/[0.08]'
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-white/85">
                  {zone.label}
                </span>
                <span className="text-xs text-white/42">
                  {zoneReferences.length}
                </span>
              </div>

              <div className="mt-2 flex min-h-16 flex-wrap gap-2">
                {zoneReferences.length > 0
                  ? zoneReferences.map((reference) => (
                      <button
                        key={reference.edgeId}
                        type="button"
                        draggable
                        onDragStart={(event) =>
                          handleDragStart(event, reference.edgeId)
                        }
                        onDragEnd={() => {
                          setDraggingEdgeId(null);
                          setDropTargetKind(null);
                        }}
                        className={cn(
                          'group/reference relative h-14 w-14 overflow-hidden rounded-[14px] border border-white/12 bg-black/60 shadow-[0_12px_24px_rgba(0,0,0,0.25)] transition hover:border-white/30',
                          'cursor-move',
                          draggingEdgeId === reference.edgeId && 'opacity-70'
                        )}
                        title={`${reference.title} • ${zone.label}`}
                      >
                        {reference.media?.url ? (
                          <img
                            src={
                              reference.media.thumbnailUrl ||
                              reference.media.url
                            }
                            alt={reference.title}
                            className="h-full w-full cursor-move object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full cursor-move items-center justify-center bg-white/[0.04] text-white/45">
                            <ImagePlus className="size-4" />
                          </div>
                        )}
                        <div className="pointer-events-none absolute inset-0 cursor-move bg-black/0 transition group-hover/reference:bg-black/10" />
                      </button>
                    ))
                  : null}
              </div>

              <div className="mt-3 border-t border-white/8 pt-3">
                <CanvasMidjourneyWeightField
                  label={zone.weightLabel}
                  value={zone.weightValue}
                  max={zone.weightMax}
                  placeholder={zone.weightPlaceholder}
                  onChange={zone.onWeightChange}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CanvasQuickAddMenu({
  menu,
  selectedCount,
  onFitView,
  onDeleteSelection,
  onCopyNode,
  onDeleteNode,
  onDeleteEdge,
  onSelect,
}: {
  menu: CanvasMenuState;
  selectedCount: number;
  onFitView: () => void;
  onDeleteSelection: () => void;
  onCopyNode: (nodeId: string) => void;
  onDeleteNode: (nodeId: string) => void;
  onDeleteEdge: (edgeId: string) => void;
  onSelect: (nodeType: CanvasNodeType) => void;
}) {
  const locale = useCanvasLocale();
  const t = useCanvasTranslations();
  const menuItems = getCanvasMenuItems(t, menu.pendingConnection);
  const isConnectionMenu = menu.mode === 'connection';
  const isPaneMenu = menu.mode === 'pane';
  const isNodeMenu = menu.mode === 'node';
  const isEdgeMenu = menu.mode === 'edge';

  return (
    <div
      className="canvas-quick-add-menu pointer-events-auto absolute z-30 w-[324px] rounded-[26px] border border-white/10 bg-[#101010]/96 p-3 shadow-[0_30px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl"
      style={{
        left: menu.x,
        top: menu.y,
      }}
    >
      {isPaneMenu ? (
        <div className="grid gap-2">
          <button
            type="button"
            onClick={onFitView}
            className="flex items-center justify-between rounded-[18px] border border-white/10 bg-white/[0.03] px-3 py-2.5 text-left transition hover:border-white/15 hover:bg-white/[0.06]"
          >
            <span className="text-sm text-white">
              {canvasT(t, 'studio.focusCanvas')}
            </span>
            <span className="text-xs text-white/45">
              {canvasT(t, 'studio.fitView')}
            </span>
          </button>
          <button
            type="button"
            onClick={onDeleteSelection}
            disabled={selectedCount === 0}
            className="flex items-center justify-between rounded-[18px] border border-white/10 bg-white/[0.03] px-3 py-2.5 text-left transition enabled:hover:border-white/15 enabled:hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-45"
          >
            <span className="text-sm text-white">
              {canvasT(t, 'studio.deleteSelection')}
            </span>
            <span className="text-xs text-white/45">
              {selectedCount > 0
                ? canvasT(t, 'studio.selectedCount', {
                    count: selectedCount,
                  })
                : canvasT(t, 'studio.noneSelected')}
            </span>
          </button>
        </div>
      ) : null}
      {isNodeMenu && menu.nodeId ? (
        <div className="grid gap-2">
          <button
            type="button"
            onClick={() => onCopyNode(menu.nodeId!)}
            className="flex items-center justify-between rounded-[18px] border border-white/10 bg-white/[0.03] px-3 py-2.5 text-left transition hover:border-white/15 hover:bg-white/[0.06]"
          >
            <span className="inline-flex items-center gap-2 text-sm text-white">
              <Copy className="size-4" />
              {canvasT(t, 'studio.copyNode')}
            </span>
          </button>
          <button
            type="button"
            onClick={() => onDeleteNode(menu.nodeId!)}
            className="flex items-center justify-between rounded-[18px] border border-rose-400/20 bg-rose-500/10 px-3 py-2.5 text-left text-rose-100 transition hover:bg-rose-500/15"
          >
            <span className="inline-flex items-center gap-2 text-sm">
              <Trash2 className="size-4" />
              {canvasT(t, 'studio.deleteNode')}
            </span>
          </button>
        </div>
      ) : null}
      {isEdgeMenu && menu.edgeId ? (
        <div className="grid gap-2">
          <button
            type="button"
            onClick={() => onDeleteEdge(menu.edgeId!)}
            className="flex items-center justify-between rounded-[18px] border border-rose-400/20 bg-rose-500/10 px-3 py-2.5 text-left text-rose-100 transition hover:bg-rose-500/15"
          >
            <span className="inline-flex items-center gap-2 text-sm">
              <Trash2 className="size-4" />
              {canvasT(t, 'studio.deleteEdge')}
            </span>
          </button>
        </div>
      ) : null}
      {isNodeMenu || isEdgeMenu ? null : (
        <div className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.nodeType}
                type="button"
                disabled={item.disabled}
                onClick={() => onSelect(item.nodeType)}
                className="flex w-full items-start gap-3 rounded-[20px] border border-transparent bg-white/[0.03] px-3 py-3 text-left transition enabled:hover:border-white/12 enabled:hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-35"
              >
                <span className="mt-0.5 rounded-2xl border border-white/10 bg-black/50 p-2 text-white/75">
                  <Icon className="size-4" />
                </span>
                <span className="space-y-1">
                  <span className="flex items-center gap-2 text-sm font-medium text-white">
                    <span>{item.label}</span>
                  </span>
                  {item.description ? (
                    <span className="block text-xs leading-5 text-white/55">
                      {item.description}
                    </span>
                  ) : null}
                  {item.disabled ? (
                    <span className="block text-[11px] leading-5 text-amber-200/80">
                      {item.disabledReason}
                    </span>
                  ) : null}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function BaseCanvasNode({
  id,
  data,
  selected,
  onPreviewImage,
  onTriggerConnectionMenu,
  expandedImagePickerNodeId,
  onToggleImagePicker,
  onSelectImageOutput,
  onSelectVideoOutput,
}: NodeProps<CanvasFlowNode> & {
  onPreviewImage?: (image: CanvasImagePreviewState) => void;
  onTriggerConnectionMenu?: (options: {
    nodeId: string;
    nodeType: CanvasNodeType;
    handleId: CanvasConnectionHandleId;
    clientX: number;
    clientY: number;
  }) => void;
  expandedImagePickerNodeId?: string | null;
  onToggleImagePicker?: (nodeId: string) => void;
  onSelectImageOutput?: (nodeId: string, index: number) => void;
  onSelectVideoOutput?: (nodeId: string, index: number) => void;
}) {
  const locale = useCanvasLocale();
  const t = useCanvasTranslations();
  const Icon = NODE_ICON_MAP[data.nodeType];
  const displayTitle = localizeCanvasNodeTitle(t, data.nodeType, data.title);
  const updateNodeData = useCanvasStore((state) => state.updateNodeData);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [draftTitle, setDraftTitle] = useState(displayTitle);
  const [isEditingTextBody, setIsEditingTextBody] = useState(false);
  const [draftTextBody, setDraftTextBody] = useState(
    data.nodeType === 'text' ? data.plainText : ''
  );
  const [isEditingNoteBody, setIsEditingNoteBody] = useState(false);
  const noteEditorRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setDraftTitle(displayTitle);
  }, [displayTitle]);

  useEffect(() => {
    if (data.nodeType === 'text') {
      setDraftTextBody(data.plainText);
    }
  }, [data.nodeType, data.plainText]);

  const handleTitleCommit = () => {
    const nextTitle =
      draftTitle.trim() || displayTitle || canvasT(t, 'common.untitledNode');
    if (nextTitle !== data.title) {
      updateNodeData(id, { title: nextTitle });
    }
    setDraftTitle(nextTitle);
    setIsEditingTitle(false);
  };

  const handleTextBodyCommit = () => {
    if (data.nodeType !== 'text') {
      return;
    }

    if (draftTextBody !== data.plainText) {
      updateNodeData(id, { plainText: draftTextBody });
    }
    setIsEditingTextBody(false);
  };

  const handleNoteBodyCommit = () => {
    if (data.nodeType !== 'note') {
      return;
    }

    const nextHtml = sanitizeCanvasNoteHtml(
      noteEditorRef.current?.innerHTML || ''
    );
    if (nextHtml !== data.noteHtml) {
      updateNodeData(id, { noteHtml: nextHtml });
    }
    setIsEditingNoteBody(false);
  };

  const handleNoteFormat = (command: 'bold' | 'italic' | 'underline') => {
    noteEditorRef.current?.focus();
    document.execCommand(command);
  };

  const previewAspectRatio =
    data.nodeType === 'image' || data.nodeType === 'video'
      ? getAspectRatioCssValue(data.aspectRatio)
      : null;
  const iconToneClass =
    data.status === 'error'
      ? 'text-rose-200'
      : data.status === 'running' || data.status === 'queued'
        ? 'text-sky-100'
        : data.status === 'success'
          ? 'text-emerald-100'
          : 'text-white/80';
  const inputHandles: Array<{
    id: CanvasConnectionHandleId;
    top?: string;
  }> =
    data.nodeType === 'note'
      ? []
      : data.nodeType === 'image'
        ? [{ id: 'left', top: '50%' }]
        : [{ id: 'left' }];
  const hiddenImageInputHandles: CanvasConnectionHandleId[] =
    data.nodeType === 'image' ? ['style-reference', 'omni-reference'] : [];

  return (
    <div
      data-selected={selected ? 'true' : 'false'}
      className={cn(
        'group/node relative cursor-grab overflow-visible rounded-[24px] border border-white/15 bg-[#151515] p-4 text-white shadow-[0_25px_70px_rgba(0,0,0,0.45)] transition-[box-shadow,border-color,transform] duration-200 hover:border-white/28 hover:shadow-[0_0_0_1px_rgba(255,255,255,0.05),0_20px_56px_rgba(0,0,0,0.52)]',
        selected &&
          'border-white/55 shadow-[0_0_0_1px_rgba(255,255,255,0.14),0_0_28px_rgba(255,255,255,0.12),0_25px_70px_rgba(0,0,0,0.58)]',
        data.status === 'running' &&
          'shadow-[0_0_0_1px_rgba(56,189,248,0.2),0_0_42px_rgba(14,165,233,0.18),0_25px_70px_rgba(0,0,0,0.55)]',
        data.status === 'queued' &&
          'shadow-[0_0_0_1px_rgba(56,189,248,0.15),0_0_28px_rgba(14,165,233,0.1),0_25px_70px_rgba(0,0,0,0.55)]',
        data.status === 'error' &&
          'shadow-[0_0_0_1px_rgba(244,63,94,0.14),0_25px_70px_rgba(0,0,0,0.55)]',
        NODE_CARD_STYLES[data.nodeType]
      )}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_68%)]" />
      {inputHandles.map((handle) => (
        <div key={handle.id}>
          <Handle
            type="source"
            id={handle.id}
            position={Position.Left}
            style={handle.top ? { top: handle.top } : undefined}
            className="canvas-node-handle !z-20 !cursor-crosshair"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onTriggerConnectionMenu?.({
                nodeId: id,
                nodeType: data.nodeType,
                handleId: handle.id,
                clientX: event.clientX,
                clientY: event.clientY,
              });
            }}
          />
        </div>
      ))}
      {hiddenImageInputHandles.map((handleId) => (
        <Handle
          key={handleId}
          type="source"
          id={handleId}
          position={Position.Left}
          style={{ top: '50%' }}
          className="canvas-node-handle pointer-events-none !z-0 !cursor-default !opacity-0"
        />
      ))}
      {data.nodeType !== 'note' ? (
        <Handle
          type="source"
          id="right"
          position={Position.Right}
          className="canvas-node-handle !z-20 !cursor-crosshair"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onTriggerConnectionMenu?.({
              nodeId: id,
              nodeType: data.nodeType,
              handleId: 'right',
              clientX: event.clientX,
              clientY: event.clientY,
            });
          }}
        />
      ) : null}

      <div className="mb-3 flex items-start gap-3">
        <div
          className={cn(
            'mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]',
            iconToneClass
          )}
        >
          <Icon
            className={cn(
              'size-4.5',
              (data.status === 'running' || data.status === 'queued') &&
                'animate-pulse'
            )}
          />
        </div>
        <div className="min-w-0 flex-1">
          {isEditingTitle ? (
            <Input
              autoFocus
              value={draftTitle}
              onChange={(event) => setDraftTitle(event.target.value)}
              onBlur={handleTitleCommit}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  handleTitleCommit();
                }
                if (event.key === 'Escape') {
                  event.preventDefault();
                  setDraftTitle(displayTitle);
                  setIsEditingTitle(false);
                }
              }}
              onPointerDown={(event) => event.stopPropagation()}
              className="nodrag nopan h-9 border-white/12 bg-white/[0.04] px-3 text-sm font-medium text-white"
            />
          ) : (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setIsEditingTitle(true);
              }}
              onPointerDown={(event) => event.stopPropagation()}
              className="nodrag nopan block max-w-full cursor-text rounded-lg px-1 py-1 text-left text-sm font-medium text-white/92 transition hover:bg-white/[0.04]"
            >
              <span className="line-clamp-2 break-words">{displayTitle}</span>
            </button>
          )}
        </div>
      </div>

      {data.nodeType === 'note' ? (
        isEditingNoteBody ? (
          <div
            className="nodrag nopan rounded-[18px] border border-amber-200/12 bg-amber-200/[0.06] p-3"
            onPointerDown={(event) => event.stopPropagation()}
            onDoubleClick={(event) => event.stopPropagation()}
          >
            <div className="mb-2 flex items-center gap-1 border-b border-white/10 pb-2">
              {[
                { command: 'bold' as const, icon: Bold, label: 'Bold' },
                { command: 'italic' as const, icon: Italic, label: 'Italic' },
                {
                  command: 'underline' as const,
                  icon: Underline,
                  label: 'Underline',
                },
              ].map((item) => {
                const FormatIcon = item.icon;
                return (
                  <button
                    key={item.command}
                    type="button"
                    onMouseDown={(event) => {
                      event.preventDefault();
                      handleNoteFormat(item.command);
                    }}
                    className="inline-flex size-8 items-center justify-center rounded-lg text-white/70 transition hover:bg-white/10 hover:text-white"
                    aria-label={item.label}
                  >
                    <FormatIcon className="size-4" />
                  </button>
                );
              })}
            </div>
            <div
              ref={noteEditorRef}
              contentEditable
              suppressContentEditableWarning
              onBlur={handleNoteBodyCommit}
              onKeyDown={(event) => {
                if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
                  event.preventDefault();
                  handleNoteBodyCommit();
                }
                if (event.key === 'Escape') {
                  event.preventDefault();
                  if (noteEditorRef.current) {
                    noteEditorRef.current.innerHTML = data.noteHtml;
                  }
                  setIsEditingNoteBody(false);
                }
              }}
              dangerouslySetInnerHTML={{
                __html: sanitizeCanvasNoteHtml(data.noteHtml),
              }}
              className="canvas-note-content max-h-[340px] min-h-[180px] overflow-y-auto rounded-[14px] px-1 py-1 text-sm leading-6 text-white/86 outline-none empty:before:text-white/35 empty:before:content-[attr(data-placeholder)]"
              data-placeholder={canvasT(t, 'studio.doubleClickNoteNode')}
            />
          </div>
        ) : (
          <button
            type="button"
            onDoubleClick={(event) => {
              event.stopPropagation();
              setIsEditingNoteBody(true);
            }}
            className="block w-full cursor-text rounded-[18px] text-left"
          >
            {renderNodePreview(t, id, data, {
              onPreviewImage,
              expandedImagePickerNodeId,
              onToggleImagePicker,
              onSelectImageOutput,
              onSelectVideoOutput,
            })}
          </button>
        )
      ) : data.nodeType === 'text' ? (
        isEditingTextBody ? (
          <div className="max-h-[340px] min-h-[220px] overflow-y-auto rounded-[20px] border border-white/8 bg-white/[0.03] p-4 text-sm leading-6 text-white/82">
            <Textarea
              autoFocus
              value={draftTextBody}
              onChange={(event) => setDraftTextBody(event.target.value)}
              onBlur={handleTextBodyCommit}
              onPointerDown={(event) => event.stopPropagation()}
              onDoubleClick={(event) => event.stopPropagation()}
              onKeyDown={(event) => {
                if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
                  event.preventDefault();
                  handleTextBodyCommit();
                }
                if (event.key === 'Escape') {
                  event.preventDefault();
                  setDraftTextBody(data.plainText);
                  setIsEditingTextBody(false);
                }
              }}
              className="nodrag nopan h-full max-h-none min-h-0 resize-none overflow-visible border-0 bg-transparent p-0 text-sm leading-6 text-white shadow-none ring-0 outline-none placeholder:text-white/28 focus-visible:ring-0"
              placeholder={canvasT(t, 'studio.doubleClickTextNode')}
            />
          </div>
        ) : (
          <button
            type="button"
            onDoubleClick={(event) => {
              event.stopPropagation();
              setIsEditingTextBody(true);
            }}
            className="block w-full cursor-text rounded-[20px] text-left"
          >
            {renderNodePreview(t, id, data, {
              onPreviewImage,
              expandedImagePickerNodeId,
              onToggleImagePicker,
              onSelectImageOutput,
              onSelectVideoOutput,
            })}
          </button>
        )
      ) : previewAspectRatio ? (
        <div
          className="relative overflow-hidden rounded-[20px] border border-white/8 bg-black/60"
          style={{ aspectRatio: previewAspectRatio }}
        >
          {renderNodePreview(t, id, data, {
            onPreviewImage,
            expandedImagePickerNodeId,
            onToggleImagePicker,
            onSelectImageOutput,
            onSelectVideoOutput,
          })}
          {data.status === 'running' || data.status === 'queued' ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/46 backdrop-blur-[2px]">
              <LoaderCircle className="size-5 animate-spin text-white" />
              <div className="w-[68%]">
                <Progress
                  value={getNodeStatusProgress(data.status)}
                  className="h-1.5 bg-white/15 [&>[data-slot=progress-indicator]]:bg-white"
                />
              </div>
              <p className="text-xs font-medium text-white/88">
                {data.inputMode === 'upload'
                  ? canvasT(t, 'studio.uploading')
                  : canvasT(t, 'studio.generating')}
              </p>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="relative">
          {renderNodePreview(t, id, data, {
            onPreviewImage,
            expandedImagePickerNodeId,
            onToggleImagePicker,
            onSelectImageOutput,
            onSelectVideoOutput,
          })}
          {data.status === 'running' || data.status === 'queued' ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-[20px] bg-black/46 backdrop-blur-[2px]">
              <LoaderCircle className="size-5 animate-spin text-white" />
              <div className="w-[68%]">
                <Progress
                  value={getNodeStatusProgress(data.status)}
                  className="h-1.5 bg-white/15 [&>[data-slot=progress-indicator]]:bg-white"
                />
              </div>
              <p className="text-xs font-medium text-white/88">
                {canvasT(t, 'studio.uploading')}
              </p>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

function CanvasConnectionEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  markerEnd,
  style,
  selected,
}: EdgeProps) {
  const reactFlow = useReactFlow<CanvasFlowNode, Edge>();
  const deleteEdge = useCanvasStore((state) => state.deleteEdge);
  const [isHovered, setIsHovered] = useState(false);
  const [hoverPosition, setHoverPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const handleMouseMove = (event: React.MouseEvent<SVGPathElement>) => {
    setIsHovered(true);
    setHoverPosition(
      reactFlow.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      })
    );
  };

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          stroke:
            isHovered || selected
              ? 'rgba(255,255,255,0.88)'
              : 'rgba(255,255,255,0.24)',
          strokeWidth: isHovered || selected ? 2.2 : 1.5,
        }}
      />
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={28}
        className="cursor-pointer"
        onMouseEnter={handleMouseMove}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => {
          setIsHovered(false);
          setHoverPosition(null);
        }}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          deleteEdge(id);
        }}
      />
      {isHovered && hoverPosition ? (
        <EdgeLabelRenderer>
          <div
            className="pointer-events-none absolute z-20"
            style={{
              transform: `translate(-50%, -50%) translate(${hoverPosition.x}px, ${hoverPosition.y}px)`,
            }}
          >
            <div className="rounded-full border border-white/15 bg-[#101010]/96 p-1.5 text-white shadow-[0_16px_40px_rgba(0,0,0,0.45)] backdrop-blur">
              <Scissors className="size-3.5" />
            </div>
          </div>
        </EdgeLabelRenderer>
      ) : null}
    </>
  );
}

const edgeTypes = {
  default: CanvasConnectionEdge,
};

function CanvasStudioInner({
  initialCanvas,
}: {
  initialCanvas: CanvasDocumentRecord;
}) {
  const locale = useCanvasLocale();
  const t = useCanvasTranslations();
  const reactFlow = useReactFlow<CanvasFlowNode, Edge>();
  const { user, fetchUserCredits, fetchUserInfo } = useAppContext();
  const hydrate = useCanvasStore((state) => state.hydrate);
  const nodes = useCanvasStore((state) => state.nodes);
  const edges = useCanvasStore((state) => state.edges);
  const viewport = useCanvasStore((state) => state.viewport);
  const isHydrated = useCanvasStore((state) => state.isHydrated);
  const isDirty = useCanvasStore((state) => state.isDirty);
  const saveStatus = useCanvasStore((state) => state.saveStatus);
  const saveError = useCanvasStore((state) => state.saveError);
  const lastSavedAt = useCanvasStore((state) => state.lastSavedAt);
  const conflictDetected = useCanvasStore((state) => state.conflictDetected);
  const addNode = useCanvasStore((state) => state.addNode);
  const duplicateNode = useCanvasStore((state) => state.duplicateNode);
  const pasteClipboard = useCanvasStore((state) => state.pasteClipboard);
  const deleteNode = useCanvasStore((state) => state.deleteNode);
  const deleteEdge = useCanvasStore((state) => state.deleteEdge);
  const deleteSelection = useCanvasStore((state) => state.deleteSelection);
  const onNodesChange = useCanvasStore((state) => state.onNodesChange);
  const onEdgesChange = useCanvasStore((state) => state.onEdgesChange);
  const connectNodes = useCanvasStore((state) => state.onConnect);
  const updateViewport = useCanvasStore((state) => state.updateViewport);
  const updateNodeData = useCanvasStore((state) => state.updateNodeData);
  const updateEdgeTargetHandle = useCanvasStore(
    (state) => state.updateEdgeTargetHandle
  );
  const applyServerNodePatch = useCanvasStore(
    (state) => state.applyServerNodePatch
  );
  const enterConflict = useCanvasStore((state) => state.enterConflict);
  const [title, setTitle] = useState(
    localizeCanvasTitle(t, initialCanvas.title)
  );
  const [isSavingTitle, setIsSavingTitle] = useState(false);
  const [isEditingCanvasTitle, setIsEditingCanvasTitle] = useState(false);
  const [isReloading, setIsReloading] = useState(false);
  const [executingNodeId, setExecutingNodeId] = useState<string | null>(null);
  const [savedTitle, setSavedTitle] = useState(
    localizeCanvasTitle(t, initialCanvas.title)
  );
  const [quickAddMenu, setQuickAddMenu] = useState<CanvasMenuState | null>(
    null
  );
  const [isPanning, setIsPanning] = useState(false);
  const [isFileDragging, setIsFileDragging] = useState(false);
  const [isMediaSettingsOpen, setIsMediaSettingsOpen] = useState(false);
  const [isMiniMapVisible, setIsMiniMapVisible] = useState(true);
  const [isUploadingAudio, setIsUploadingAudio] = useState(false);
  const [expandedImagePickerNodeId, setExpandedImagePickerNodeId] = useState<
    string | null
  >(null);
  const [liveViewport, setLiveViewport] = useState(
    normalizeCanvasViewport(initialCanvas.graph.viewport)
  );
  const [imagePreview, setImagePreview] =
    useState<CanvasImagePreviewState | null>(null);
  const [imageEditor, setImageEditor] = useState<CanvasImageEditorState | null>(
    null
  );
  const [isCopyingPreviewImage, setIsCopyingPreviewImage] = useState(false);
  const [isPublishingTemplate, setIsPublishingTemplate] = useState(false);
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [publishedTemplateUrl, setPublishedTemplateUrl] = useState('');
  const hydratedCanvasIdRef = useRef<string | null>(null);
  const clipboardRef = useRef<{
    payload: CanvasClipboardPayload;
    pasteCount: number;
  } | null>(null);
  const saveRequestInFlightRef = useRef(false);
  const runPollingTimersRef = useRef<Map<string, number>>(new Map());
  const selectedImageMediaByNodeIdRef = useRef<Map<string, CanvasNodeMedia>>(
    new Map()
  );
  const hasRequestedUserCreditsRef = useRef(false);
  const canvasViewportRef = useRef<HTMLDivElement | null>(null);
  const dragDepthRef = useRef(0);
  const graph = buildCanvasGraphFromFlow({
    nodes,
    edges,
    viewport,
  });
  const activePreviewImage =
    imagePreview?.images[imagePreview.activeIndex] || null;
  const activePreviewImageProxyUrl = activePreviewImage?.url
    ? `/api/proxy/file?url=${encodeURIComponent(activePreviewImage.url)}`
    : null;
  const graphString = JSON.stringify(graph);
  const selectedNodes = nodes.filter((node) => node.selected);
  const selectedNode = selectedNodes.length === 1 ? selectedNodes[0] : null;
  const selectedNodeData = selectedNode?.data || null;
  const selectedCount =
    nodes.filter((node) => node.selected).length +
    edges.filter((edge) => edge.selected).length;
  const selectedDescriptor =
    selectedNode && selectedNode.data.nodeType !== 'note'
      ? buildCanvasNodeTaskDescriptor(graph, selectedNode.id)
      : null;
  const selectedReferences = selectedNode
    ? getCanvasReferenceItems(graph, selectedNode.id)
    : [];
  const selectedMediaMode =
    selectedNodeData &&
    (selectedNodeData.nodeType === 'image' ||
      selectedNodeData.nodeType === 'video' ||
      selectedNodeData.nodeType === 'audio')
      ? getMediaInputMode(selectedNodeData)
      : null;
  const shouldDisableMjImageReferenceTokens =
    selectedNodeData?.nodeType === 'image' &&
    isMidjourneyCanvasImageModel(selectedNodeData.model);
  const selectedNodeModelOptions =
    selectedNodeData && selectedNode
      ? getNodeModelOptionsForSelection(selectedNodeData, selectedReferences)
      : [];
  const selectedVideoScene =
    selectedNodeData?.nodeType === 'video'
      ? getRequiredModelScene(selectedNodeData, selectedReferences)
      : null;
  const shouldShowSeedanceReferenceMode =
    selectedNodeData?.nodeType === 'video' &&
    isSeedanceCanvasReferenceModeModel(selectedNodeData.model) &&
    selectedMediaMode === 'generate' &&
    selectedVideoScene === 'image-to-video';
  const selectedVideoAspectRatioOptions =
    selectedNodeData?.nodeType === 'video'
      ? getCanvasVideoAspectRatioOptions(
          selectedNodeData.model,
          selectedVideoScene as AICreditScene | null
        )
      : ['16:9', '9:16', '1:1', '21:9', '4:3', '3:4'];
  const selectedVideoResolutionOptions =
    selectedNodeData?.nodeType === 'video'
      ? getCanvasVideoResolutionOptions(
          selectedNodeData.model,
          selectedVideoScene as AICreditScene | null
        )
      : ['480p', '720p', '1080p'];
  const selectedVideoDurationOptions =
    selectedNodeData?.nodeType === 'video'
      ? getCanvasVideoDurationOptions(
          selectedNodeData.model,
          selectedVideoScene as AICreditScene | null
        )
      : ['5', '10', '15'];
  const remainingCredits = user?.credits?.remainingCredits ?? 0;

  useEffect(() => {
    if (!selectedNode || !selectedNodeData) {
      return;
    }

    const redirectedLegacyModel =
      selectedNodeData.nodeType === 'video'
        ? LEGACY_CANVAS_VIDEO_MODEL_REDIRECTS[selectedNodeData.model]
        : undefined;
    if (redirectedLegacyModel) {
      updateNodeData(selectedNode.id, {
        model: redirectedLegacyModel,
      } as Partial<CanvasNodeData>);
      return;
    }

    if (
      selectedNodeData.nodeType === 'video' &&
      selectedNodeModelOptions.length > 0 &&
      !selectedNodeModelOptions.includes(selectedNodeData.model)
    ) {
      updateNodeData(selectedNode.id, {
        model: selectedNodeModelOptions[0],
      } as Partial<CanvasNodeData>);
      return;
    }

    if (
      selectedNodeData.nodeType === 'video' &&
      selectedVideoAspectRatioOptions.length > 0 &&
      !selectedVideoAspectRatioOptions.includes(selectedNodeData.aspectRatio)
    ) {
      updateNodeData(selectedNode.id, {
        aspectRatio: selectedVideoAspectRatioOptions[0],
      } as Partial<CanvasNodeData>);
      return;
    }

    if (
      selectedNodeData.nodeType === 'video' &&
      selectedVideoResolutionOptions.length > 0 &&
      !selectedVideoResolutionOptions.includes(selectedNodeData.resolution)
    ) {
      updateNodeData(selectedNode.id, {
        resolution: selectedVideoResolutionOptions[0],
      } as Partial<CanvasNodeData>);
      return;
    }

    if (
      selectedNodeData.nodeType === 'video' &&
      selectedVideoDurationOptions.length > 0 &&
      !selectedVideoDurationOptions.includes(selectedNodeData.duration)
    ) {
      updateNodeData(selectedNode.id, {
        duration: selectedVideoDurationOptions[0],
      } as Partial<CanvasNodeData>);
    }
  }, [
    selectedNode,
    selectedNodeData,
    selectedNodeModelOptions,
    selectedVideoAspectRatioOptions,
    selectedVideoResolutionOptions,
    selectedVideoDurationOptions,
    updateNodeData,
  ]);

  const selectedGenerateCreditQuote = useMemo(() => {
    if (
      !selectedNode ||
      !selectedNodeData ||
      selectedMediaMode !== 'generate' ||
      (selectedNodeData.nodeType !== 'image' &&
        selectedNodeData.nodeType !== 'video' &&
        selectedNodeData.nodeType !== 'audio')
    ) {
      return null;
    }

    if (selectedDescriptor && 'kind' in selectedDescriptor) {
      return selectedDescriptor.kind === 'media'
        ? quoteAICredits({
            mediaType: selectedDescriptor.mediaType,
            model: selectedDescriptor.model,
            provider: selectedDescriptor.provider,
            scene: selectedDescriptor.scene,
            options: selectedDescriptor.options,
          })
        : null;
    }

    return quoteCanvasNodeCredits(
      selectedNodeData,
      resolveCanvasNodeInputs(graph, selectedNode.id)
    );
  }, [
    graph,
    selectedDescriptor,
    selectedMediaMode,
    selectedNode,
    selectedNodeData,
  ]);
  const selectedGenerateCredits =
    selectedGenerateCreditQuote?.credits ??
    selectedNodeData?.costCredits ??
    null;
  const shouldShowSelectedCredits =
    selectedMediaMode === 'generate' &&
    selectedNodeData &&
    (selectedNodeData.nodeType === 'image' ||
      selectedNodeData.nodeType === 'video' ||
      selectedNodeData.nodeType === 'audio');
  const selectedGenerateCreditLabel =
    selectedGenerateCredits !== null ? String(selectedGenerateCredits) : '--';
  const viewportZoomPercent = Math.min(
    CANVAS_MAX_ZOOM_PERCENT,
    Math.max(
      CANVAS_MIN_ZOOM_PERCENT,
      Math.round((liveViewport.zoom || 1) * 100)
    )
  );

  useEffect(() => {
    if (user) {
      if (!hasRequestedUserCreditsRef.current) {
        hasRequestedUserCreditsRef.current = true;
        void fetchUserCredits();
      }
      return;
    }

    void fetchUserInfo();
  }, [fetchUserCredits, fetchUserInfo, user]);

  const buildClipboardPayload =
    useCallback((): CanvasClipboardPayload | null => {
      if (selectedNodes.length === 0) {
        return null;
      }

      const selectedNodeIds = new Set(selectedNodes.map((node) => node.id));

      return {
        version: 1,
        nodes: selectedNodes.map((node) => ({
          id: node.id,
          type: (node.type || node.data.nodeType) as CanvasNodeType,
          position: {
            x: Number(node.position.x || 0),
            y: Number(node.position.y || 0),
          },
          data: normalizeCanvasNodeData(
            (node.type || node.data.nodeType) as CanvasNodeType,
            node.data
          ),
        })),
        edges: edges
          .filter(
            (edge) =>
              selectedNodeIds.has(edge.source) &&
              selectedNodeIds.has(edge.target)
          )
          .map((edge) => ({
            source: edge.source,
            target: edge.target,
            sourceHandle: edge.sourceHandle,
            targetHandle: edge.targetHandle,
            type: typeof edge.type === 'string' ? edge.type : 'default',
            data:
              edge.data &&
              typeof edge.data === 'object' &&
              !Array.isArray(edge.data)
                ? (edge.data as Record<string, unknown>)
                : undefined,
          })),
      };
    }, [edges, selectedNodes]);

  const buildPasteOffset = useCallback(
    (payload: CanvasClipboardPayload, pasteCount: number) => {
      const containerRect = canvasViewportRef.current?.getBoundingClientRect();
      const baseShift = 48 * Math.max(1, pasteCount + 1);

      if (!containerRect || payload.nodes.length === 0) {
        return {
          x: baseShift,
          y: baseShift,
        };
      }

      const minX = Math.min(...payload.nodes.map((node) => node.position.x));
      const maxX = Math.max(...payload.nodes.map((node) => node.position.x));
      const minY = Math.min(...payload.nodes.map((node) => node.position.y));
      const maxY = Math.max(...payload.nodes.map((node) => node.position.y));
      const viewportCenter = reactFlow.screenToFlowPosition({
        x: containerRect.left + containerRect.width / 2,
        y: containerRect.top + containerRect.height / 2,
      });

      return {
        x: viewportCenter.x - (minX + maxX) / 2 + baseShift,
        y: viewportCenter.y - (minY + maxY) / 2 + baseShift,
      };
    },
    [reactFlow]
  );

  const handlePasteClipboardPayload = useCallback(
    (payload: CanvasClipboardPayload, pasteCount: number) => {
      const result = pasteClipboard({
        nodes: payload.nodes,
        edges: payload.edges,
        offset: buildPasteOffset(payload, pasteCount),
      });
      if (!result.ok) {
        toast.error(translateCanvasRuntimeMessage(t, result.message));
      }

      return result;
    },
    [buildPasteOffset, pasteClipboard, t]
  );

  const handleToggleNodeImagePicker = useCallback((nodeId: string) => {
    setExpandedImagePickerNodeId((current) =>
      current === nodeId ? null : nodeId
    );
  }, []);

  const handleNodeImageOutputSelect = useCallback(
    (nodeId: string, index: number) => {
      const node = useCanvasStore
        .getState()
        .nodes.find((item) => item.id === nodeId);
      if (!node || node.data.nodeType !== 'image') {
        return;
      }

      const imageOutputs = getCanvasImageOutputs(node.data);
      const nextIndex = clampCanvasImageIndex(
        index,
        imageOutputs.length,
        node.data.selectedImageIndex
      );
      const nextImage = imageOutputs[nextIndex];
      if (!nextImage) {
        return;
      }

      selectedImageMediaByNodeIdRef.current.set(nodeId, nextImage);
      updateNodeData(nodeId, {
        image: nextImage,
        selectedImageIndex: nextIndex,
      } as Partial<CanvasNodeData>);
      setExpandedImagePickerNodeId(null);
    },
    [updateNodeData]
  );

  const handleSaveEditedImage = useCallback(
    (payload: CanvasImageEditorSavePayload) => {
      if (!imageEditor) {
        return;
      }

      const nodeId = imageEditor.nodeId;
      const node = useCanvasStore
        .getState()
        .nodes.find((item) => item.id === nodeId);
      if (!node || node.data.nodeType !== 'image') {
        return;
      }

      const imageOutputs = getCanvasImageOutputs(node.data);
      const nextOutputs =
        imageOutputs.length > 0
          ? [...imageOutputs]
          : node.data.image
            ? [node.data.image]
            : [];

      updateNodeData(nodeId, {
        inputMode: 'upload',
        status: 'running',
        errorMessage: null,
        lastRunId: null,
        lastCompletedAt: null,
        lastScene: null,
      } as Partial<CanvasNodeData>);

      void (async () => {
        let stepStartedAt = payload.exportedAt;
        const logTiming = (step: string, stepStartedAt: number) => {
          const now = performance.now();
          console.info('[canvas:image-editor:save]', {
            step,
            stepMs: Math.round(now - stepStartedAt),
            totalMs: Math.round(now - payload.startedAt),
            canvasWidth: payload.canvasWidth,
            canvasHeight: payload.canvasHeight,
            fileSize: payload.file.size,
            fileType: payload.file.type,
          });
          return now;
        };

        try {
          const uploadedMedia = await uploadCanvasImage(payload.file);
          stepStartedAt = logTiming('upload_image', stepStartedAt);

          const media = {
            ...uploadedMedia,
            thumbnailUrl: uploadedMedia.thumbnailUrl || uploadedMedia.url,
            size: payload.file.size,
          };
          const uploadedOutputs = [...nextOutputs, media];
          const nextSelectedImageIndex = uploadedOutputs.length - 1;
          selectedImageMediaByNodeIdRef.current.set(nodeId, media);
          updateNodeData(nodeId, {
            image: media,
            imageOutputs: uploadedOutputs,
            selectedImageIndex: nextSelectedImageIndex,
            inputMode: 'upload',
            status: 'success',
            errorMessage: null,
          } as Partial<CanvasNodeData>);
          logTiming('apply_node_update', stepStartedAt);
          toast.success('Image edit saved.');
        } catch (error) {
          console.error('save canvas image edit upload failed', error);
          updateNodeData(nodeId, {
            status: 'error',
            errorMessage:
              error instanceof Error ? error.message : '图片保存失败。',
          } as Partial<CanvasNodeData>);
          toast.error(
            error instanceof Error
              ? translateCanvasRuntimeMessage(
                  t,
                  error.message,
                  '图片保存失败。'
                )
              : '图片保存失败。'
          );
        }
      })();
    },
    [imageEditor, t, updateNodeData]
  );

  const handleNodeVideoOutputSelect = useCallback(
    (nodeId: string, index: number) => {
      const node = useCanvasStore
        .getState()
        .nodes.find((item) => item.id === nodeId);
      if (!node || node.data.nodeType !== 'video') {
        return;
      }

      const videoHistory = getCanvasVideoHistory(node.data);
      const nextIndex = clampCanvasImageIndex(
        index,
        videoHistory.length,
        node.data.selectedVideoIndex
      );
      const nextVideo = videoHistory[nextIndex];
      if (!nextVideo) {
        return;
      }

      updateNodeData(nodeId, {
        video: nextVideo,
        selectedVideoIndex: nextIndex,
      } as Partial<CanvasNodeData>);
    },
    [updateNodeData]
  );

  function handleAssignMjReference(edgeId: string, kind: CanvasReferenceKind) {
    updateEdgeTargetHandle(edgeId, getCanvasHandleIdForReferenceKind(kind));
  }

  const openQuickAddMenu = useCallback(
    ({
      clientX,
      clientY,
      mode = 'quick-add',
      pendingConnection,
      nodeId,
      edgeId,
      align = 'cursor',
    }: {
      clientX: number;
      clientY: number;
      mode?: CanvasMenuState['mode'];
      pendingConnection?: PendingCanvasConnection;
      nodeId?: string;
      edgeId?: string;
      align?: 'cursor' | 'center-trigger';
    }) => {
      const rect = canvasViewportRef.current?.getBoundingClientRect();
      if (!rect) {
        return;
      }

      const menuWidth = 324;
      const menuHeight =
        mode === 'pane'
          ? 360
          : mode === 'node' || mode === 'edge'
            ? 176
            : pendingConnection
              ? 368
              : 352;
      const padding = 20;
      const proposedX =
        align === 'center-trigger'
          ? clientX - rect.left - menuWidth / 2
          : clientX - rect.left + 12;
      const x = Math.min(
        Math.max(proposedX, padding),
        rect.width - menuWidth - padding
      );
      const y = Math.min(
        Math.max(clientY - rect.top + 12, padding),
        rect.height - menuHeight - padding
      );

      setQuickAddMenu({
        x,
        y,
        mode,
        pendingConnection,
        nodeId,
        edgeId,
        flowPosition: reactFlow.screenToFlowPosition({
          x: clientX,
          y: clientY,
        }),
      });
    },
    [reactFlow]
  );

  const handleNodeConnectionMenu = useCallback(
    ({
      nodeId,
      nodeType,
      handleId,
      clientX,
      clientY,
    }: {
      nodeId: string;
      nodeType: CanvasNodeType;
      handleId: CanvasConnectionHandleId;
      clientX: number;
      clientY: number;
    }) => {
      openQuickAddMenu({
        clientX,
        clientY,
        mode: 'connection',
        pendingConnection: {
          sourceNodeId: nodeId,
          sourceNodeType: nodeType,
          sourceHandleId: handleId,
        },
        align: 'center-trigger',
      });
    },
    [openQuickAddMenu]
  );

  const nodeTypes = useMemo(
    () => ({
      text: (props: NodeProps<CanvasFlowNode>) => (
        <BaseCanvasNode
          {...props}
          onPreviewImage={setImagePreview}
          onTriggerConnectionMenu={handleNodeConnectionMenu}
          expandedImagePickerNodeId={expandedImagePickerNodeId}
          onToggleImagePicker={handleToggleNodeImagePicker}
          onSelectImageOutput={handleNodeImageOutputSelect}
          onSelectVideoOutput={handleNodeVideoOutputSelect}
        />
      ),
      note: (props: NodeProps<CanvasFlowNode>) => (
        <BaseCanvasNode
          {...props}
          onPreviewImage={setImagePreview}
          onTriggerConnectionMenu={handleNodeConnectionMenu}
          expandedImagePickerNodeId={expandedImagePickerNodeId}
          onToggleImagePicker={handleToggleNodeImagePicker}
          onSelectImageOutput={handleNodeImageOutputSelect}
          onSelectVideoOutput={handleNodeVideoOutputSelect}
        />
      ),
      image: (props: NodeProps<CanvasFlowNode>) => (
        <BaseCanvasNode
          {...props}
          onPreviewImage={setImagePreview}
          onTriggerConnectionMenu={handleNodeConnectionMenu}
          expandedImagePickerNodeId={expandedImagePickerNodeId}
          onToggleImagePicker={handleToggleNodeImagePicker}
          onSelectImageOutput={handleNodeImageOutputSelect}
          onSelectVideoOutput={handleNodeVideoOutputSelect}
        />
      ),
      video: (props: NodeProps<CanvasFlowNode>) => (
        <BaseCanvasNode
          {...props}
          onPreviewImage={setImagePreview}
          onTriggerConnectionMenu={handleNodeConnectionMenu}
          expandedImagePickerNodeId={expandedImagePickerNodeId}
          onToggleImagePicker={handleToggleNodeImagePicker}
          onSelectImageOutput={handleNodeImageOutputSelect}
          onSelectVideoOutput={handleNodeVideoOutputSelect}
        />
      ),
      audio: (props: NodeProps<CanvasFlowNode>) => (
        <BaseCanvasNode
          {...props}
          onPreviewImage={setImagePreview}
          onTriggerConnectionMenu={handleNodeConnectionMenu}
          expandedImagePickerNodeId={expandedImagePickerNodeId}
          onToggleImagePicker={handleToggleNodeImagePicker}
          onSelectImageOutput={handleNodeImageOutputSelect}
          onSelectVideoOutput={handleNodeVideoOutputSelect}
        />
      ),
    }),
    [
      expandedImagePickerNodeId,
      handleNodeConnectionMenu,
      handleToggleNodeImagePicker,
      handleNodeImageOutputSelect,
      handleNodeVideoOutputSelect,
    ]
  );

  useEffect(() => {
    setIsMediaSettingsOpen(false);
  }, [selectedNode?.id]);

  useEffect(() => {
    if (
      !selectedNode ||
      !selectedNodeData ||
      selectedNodeData.nodeType !== 'image' ||
      !isMidjourneyCanvasImageModel(selectedNodeData.model) ||
      selectedNodeData.sceneMode === 'auto'
    ) {
      return;
    }

    updateNodeData(selectedNode.id, {
      sceneMode: 'auto',
    } as Partial<CanvasNodeData>);
  }, [selectedNode, selectedNodeData, updateNodeData]);

  useEffect(() => {
    setExpandedImagePickerNodeId(null);
  }, [selectedNode?.id]);

  useEffect(() => {
    if (!expandedImagePickerNodeId) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest('[data-canvas-image-picker-root="true"]')) {
        return;
      }
      setExpandedImagePickerNodeId(null);
    };

    document.addEventListener('pointerdown', handlePointerDown, true);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true);
    };
  }, [expandedImagePickerNodeId]);

  useEffect(() => {
    if (hydratedCanvasIdRef.current === initialCanvas.id) {
      return;
    }

    hydratedCanvasIdRef.current = initialCanvas.id;
    hydrate(initialCanvas);
    setTitle(localizeCanvasTitle(t, initialCanvas.title));
    setSavedTitle(localizeCanvasTitle(t, initialCanvas.title));
    setIsEditingCanvasTitle(false);

    const nextViewport = normalizeCanvasViewport(initialCanvas.graph.viewport);
    setLiveViewport(nextViewport);
    window.requestAnimationFrame(() => {
      void reactFlow.setViewport(nextViewport, {
        duration: 0,
      });
    });
  }, [hydrate, initialCanvas, locale, reactFlow]);

  useEffect(() => {
    return () => {
      for (const timeoutId of runPollingTimersRef.current.values()) {
        window.clearTimeout(timeoutId);
      }
      runPollingTimersRef.current.clear();
    };
  }, []);

  useEffect(() => {
    if (!quickAddMenu) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest('.canvas-quick-add-menu')) {
        return;
      }

      setQuickAddMenu(null);
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setQuickAddMenu(null);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [quickAddMenu]);

  useEffect(() => {
    const handleCopy = (event: ClipboardEvent) => {
      if (isEditableTarget(event.target) || imagePreview) {
        return;
      }

      const payload = buildClipboardPayload();
      if (!payload) {
        return;
      }

      clipboardRef.current = {
        payload,
        pasteCount: 0,
      };

      if (event.clipboardData) {
        event.clipboardData.setData(
          CANVAS_CLIPBOARD_MIME,
          JSON.stringify(payload)
        );
        event.preventDefault();
      }
    };

    const handlePaste = (event: ClipboardEvent) => {
      if (isEditableTarget(event.target) || imagePreview) {
        return;
      }

      const clipboardPayload =
        parseCanvasClipboardPayload(
          event.clipboardData?.getData(CANVAS_CLIPBOARD_MIME)
        ) || clipboardRef.current?.payload;
      if (!clipboardPayload) {
        return;
      }

      event.preventDefault();
      const nextPasteCount =
        clipboardRef.current?.payload === clipboardPayload
          ? clipboardRef.current.pasteCount
          : 0;
      const result = handlePasteClipboardPayload(
        clipboardPayload,
        nextPasteCount
      );

      if (!result.ok) {
        return;
      }

      clipboardRef.current = {
        payload: clipboardPayload,
        pasteCount: nextPasteCount + 1,
      };
    };

    document.addEventListener('copy', handleCopy);
    document.addEventListener('paste', handlePaste);
    return () => {
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('paste', handlePaste);
    };
  }, [buildClipboardPayload, handlePasteClipboardPayload, imagePreview]);

  useEffect(() => {
    const container = canvasViewportRef.current;
    if (!container) {
      return;
    }

    const handleWheel = (event: WheelEvent) => {
      if (event.ctrlKey || event.metaKey) {
        return;
      }

      const target = event.target as HTMLElement | null;
      if (
        !target?.closest('.react-flow') ||
        target.closest('.react-flow__panel') ||
        target.closest('.canvas-quick-add-menu')
      ) {
        return;
      }

      event.preventDefault();
      const currentViewport = reactFlow.getViewport();
      const primaryDelta =
        Math.abs(event.deltaX) > Math.abs(event.deltaY)
          ? event.deltaX
          : event.deltaY;
      const nextViewport = {
        x: event.shiftKey
          ? currentViewport.x - primaryDelta
          : currentViewport.x,
        y: event.shiftKey
          ? currentViewport.y
          : currentViewport.y - event.deltaY,
        zoom: currentViewport.zoom,
      };

      setLiveViewport(nextViewport);
      updateViewport(nextViewport);
      void reactFlow.setViewport(nextViewport, { duration: 0 });
    };

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        !target?.closest('.react-flow') ||
        target.closest('.react-flow__panel') ||
        target.closest('.canvas-quick-add-menu') ||
        target.closest('.nodrag')
      ) {
        return;
      }

      if (event.button === 1 || event.button === 2) {
        setIsPanning(true);
      }
    };

    const handlePointerUp = () => {
      setIsPanning(false);
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    container.addEventListener('pointerdown', handlePointerDown, true);
    window.addEventListener('pointerup', handlePointerUp);

    return () => {
      container.removeEventListener('wheel', handleWheel);
      container.removeEventListener('pointerdown', handlePointerDown, true);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [reactFlow, updateViewport]);

  useEffect(() => {
    const container = canvasViewportRef.current;
    if (!container) {
      return;
    }

    const hasFiles = (event: DragEvent) =>
      Array.from(event.dataTransfer?.types || []).includes('Files');

    const handleDragEnter = (event: DragEvent) => {
      if (!hasFiles(event)) {
        return;
      }
      event.preventDefault();
      dragDepthRef.current += 1;
      setIsFileDragging(true);
    };

    const handleDragOver = (event: DragEvent) => {
      if (!hasFiles(event)) {
        return;
      }
      event.preventDefault();
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = 'copy';
      }
      setIsFileDragging(true);
    };

    const handleDragLeave = (event: DragEvent) => {
      if (!hasFiles(event)) {
        return;
      }
      event.preventDefault();
      dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
      if (dragDepthRef.current === 0) {
        setIsFileDragging(false);
      }
    };

    const handleDrop = async (event: DragEvent) => {
      if (!hasFiles(event)) {
        return;
      }
      event.preventDefault();
      dragDepthRef.current = 0;
      setIsFileDragging(false);

      const files = Array.from(event.dataTransfer?.files || []);
      if (files.length === 0) {
        return;
      }

      const basePosition = reactFlow.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      for (const [index, file] of files.entries()) {
        const position = {
          x: basePosition.x + index * 36,
          y: basePosition.y + index * 28,
        };
        const name = file.name.toLowerCase();
        const isImageFile =
          IMAGE_ACCEPT.split(',').includes(file.type) ||
          /\.(png|jpe?g|webp|gif|svg|avif|heic|heif)$/i.test(name);
        const isVideoFile =
          VIDEO_ACCEPT.split(',').includes(file.type) ||
          /\.(mp4|mov)$/i.test(name);
        const isAudioFile =
          ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav'].includes(
            file.type
          ) || /\.(mp3|wav)$/i.test(name);
        const isTextFile =
          file.type === 'text/plain' ||
          file.type === 'text/markdown' ||
          /\.(md|txt)$/i.test(name);

        try {
          if (isImageFile) {
            await createMediaNodeFromFile({
              file,
              nodeType: 'image',
              position,
            });
            continue;
          }

          if (isVideoFile) {
            await createMediaNodeFromFile({
              file,
              nodeType: 'video',
              position,
            });
            continue;
          }

          if (isAudioFile) {
            await createAudioNodeFromFile({
              file,
              position,
            });
            continue;
          }

          if (isTextFile) {
            await createTextNodeFromFile({ file, position });
            continue;
          }

          toast.error(
            canvasT(t, 'toast.unsupportedFileType', { name: file.name })
          );
        } catch (error) {
          toast.error(
            error instanceof Error
              ? `${file.name}: ${translateCanvasRuntimeMessage(t, error.message)}`
              : canvasT(t, 'toast.importFileFailed', { name: file.name })
          );
        }
      }
    };

    container.addEventListener('dragenter', handleDragEnter);
    container.addEventListener('dragover', handleDragOver);
    container.addEventListener('dragleave', handleDragLeave);
    container.addEventListener('drop', handleDrop);

    return () => {
      container.removeEventListener('dragenter', handleDragEnter);
      container.removeEventListener('dragover', handleDragOver);
      container.removeEventListener('dragleave', handleDragLeave);
      container.removeEventListener('drop', handleDrop);
    };
  }, [reactFlow]);

  const tryAutoResolveRevisionConflict = async () => {
    const store = useCanvasStore.getState();
    const localGraph = buildCanvasGraphFromFlow({
      nodes: store.nodes,
      edges: store.edges,
      viewport: store.viewport,
    });
    const baseGraph = parseCanvasGraph(store.savedGraphString);
    const latestResponse = await fetch(`/api/canvas/${initialCanvas.id}`);

    if (!latestResponse.ok) {
      throw new Error(`request failed with status ${latestResponse.status}`);
    }

    const latestJson = await latestResponse.json();
    if (latestJson.code !== 0 || !latestJson.data?.canvas) {
      throw new Error(
        translateCanvasRuntimeMessage(
          t,
          latestJson.message || '',
          'runtime.reloadCanvasFailed'
        )
      );
    }

    const latestCanvas = latestJson.data.canvas as CanvasDocumentRecord;
    const mergedGraph = rebaseCanvasGraphEdits({
      baseGraph,
      localGraph,
      remoteGraph: latestCanvas.graph,
    });
    const mergedGraphString = JSON.stringify(mergedGraph);
    const latestGraphString = JSON.stringify(latestCanvas.graph);

    if (mergedGraphString !== latestGraphString) {
      const retryResponse = await fetch(
        `/api/canvas/${initialCanvas.id}/graph`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            revision: latestCanvas.revision,
            graph: mergedGraph,
          }),
        }
      );

      if (!retryResponse.ok) {
        throw new Error(`request failed with status ${retryResponse.status}`);
      }

      const retryJson = await retryResponse.json();
      if (retryJson.code !== 0) {
        throw new Error(retryJson.message || 'revision_conflict');
      }

      const resolvedRevision =
        typeof retryJson.data?.revision === 'number'
          ? retryJson.data.revision
          : latestCanvas.revision + 1;
      const resolvedUpdatedAt =
        typeof retryJson.data?.updatedAt === 'string'
          ? retryJson.data.updatedAt
          : new Date().toISOString();

      hydrate({
        ...latestCanvas,
        graph: mergedGraph,
        revision: resolvedRevision,
        updatedAt: resolvedUpdatedAt,
      });
      setLiveViewport(normalizeCanvasViewport(mergedGraph.viewport));
      await reactFlow.setViewport(
        normalizeCanvasViewport(mergedGraph.viewport),
        {
          duration: 0,
        }
      );
      return resolvedRevision;
    }

    hydrate(latestCanvas);
    setLiveViewport(normalizeCanvasViewport(latestCanvas.graph.viewport));
    await reactFlow.setViewport(
      normalizeCanvasViewport(latestCanvas.graph.viewport),
      {
        duration: 0,
      }
    );
    return latestCanvas.revision;
  };

  const saveGraphNow = async () => {
    while (saveRequestInFlightRef.current) {
      await new Promise((resolve) => window.setTimeout(resolve, 120));
    }

    const store = useCanvasStore.getState();
    if (store.conflictDetected) {
      throw new Error('revision_conflict');
    }

    if (!store.isDirty) {
      return store.revision;
    }

    const nextGraph = buildCanvasGraphFromFlow({
      nodes: store.nodes,
      edges: store.edges,
      viewport: store.viewport,
    });
    const validation = validateCanvasGraph(nextGraph);
    if (!validation.ok) {
      useCanvasStore.getState().failSave(validation.code);
      throw new Error(validation.code);
    }

    const nextGraphString = JSON.stringify(nextGraph);

    try {
      saveRequestInFlightRef.current = true;
      useCanvasStore.getState().markSaving();

      const response = await fetch(`/api/canvas/${initialCanvas.id}/graph`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          revision: store.revision,
          graph: nextGraph,
        }),
      });

      if (!response.ok) {
        throw new Error(`request failed with status ${response.status}`);
      }

      const json = await response.json();
      if (json.code !== 0) {
        if (json.message === 'revision_conflict') {
          try {
            return await tryAutoResolveRevisionConflict();
          } catch {
            enterConflict(canvasT(t, 'runtime.latestSavedElsewhere'));
            throw new Error('revision_conflict');
          }
        }

        throw new Error(
          translateCanvasRuntimeMessage(
            t,
            json.message || '',
            'runtime.saveCanvasGraphFailed'
          )
        );
      }

      useCanvasStore.getState().finishSave({
        revision:
          typeof json.data?.revision === 'number'
            ? json.data.revision
            : store.revision + 1,
        updatedAt:
          typeof json.data?.updatedAt === 'string'
            ? json.data.updatedAt
            : new Date().toISOString(),
        savedGraphString: nextGraphString,
      });

      return typeof json.data?.revision === 'number'
        ? json.data.revision
        : store.revision + 1;
    } catch (error) {
      if (error instanceof Error && error.message === 'revision_conflict') {
        toast.error(canvasT(t, 'toast.newerCanvasVersionDetected'));
      } else {
        useCanvasStore
          .getState()
          .failSave(
            error instanceof Error ? error.message : 'save canvas graph failed'
          );
      }
      throw error;
    } finally {
      saveRequestInFlightRef.current = false;
    }
  };

  useEffect(() => {
    if (
      !isHydrated ||
      !isDirty ||
      conflictDetected ||
      saveRequestInFlightRef.current
    ) {
      return;
    }

    const timer = window.setTimeout(() => {
      void saveGraphNow().catch(() => null);
    }, 1200);

    return () => {
      window.clearTimeout(timer);
    };
  }, [conflictDetected, graphString, initialCanvas.id, isDirty, isHydrated]);

  const handleAddNode = (
    nodeType: CanvasNodeType,
    position?: { x: number; y: number }
  ) => {
    const resolvedPosition = position
      ? position
      : (() => {
          const rect = canvasViewportRef.current?.getBoundingClientRect();
          if (!rect) {
            return undefined;
          }

          return reactFlow.screenToFlowPosition({
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2,
          });
        })();

    const result = addNode(nodeType, resolvedPosition, locale);
    if (!result.ok && result.message !== 'No node changes to apply.') {
      toast.error(translateCanvasRuntimeMessage(t, result.message));
    }

    if (result.ok && (nodeType === 'image' || nodeType === 'video')) {
      const createdNode = useCanvasStore
        .getState()
        .nodes.find((item) => item.id === result.nodeId);
      if (createdNode) {
        const preferencePatch = buildCanvasDefaultPreferencePatch(
          createdNode.data
        );
        updateNodeData(result.nodeId, preferencePatch);
      }
    }

    return result;
  };

  const handleQuickAddSelect = (nodeType: CanvasNodeType) => {
    const result = handleAddNode(nodeType, quickAddMenu?.flowPosition);
    if (!result.ok) {
      return;
    }

    if (quickAddMenu?.pendingConnection) {
      const isUpstream = isCanvasLeftHandle(
        quickAddMenu.pendingConnection.sourceHandleId
      );
      const connectionResult = connectNodes({
        source: isUpstream
          ? result.nodeId
          : quickAddMenu.pendingConnection.sourceNodeId,
        target: isUpstream
          ? quickAddMenu.pendingConnection.sourceNodeId
          : result.nodeId,
        sourceHandle: isUpstream
          ? 'right'
          : quickAddMenu.pendingConnection.sourceHandleId,
        targetHandle: isUpstream
          ? quickAddMenu.pendingConnection.sourceHandleId
          : 'left',
      });

      if (!connectionResult.ok) {
        toast.error(translateCanvasRuntimeMessage(t, connectionResult.message));
      }
    }

    setQuickAddMenu(null);
  };

  const handlePaneDoubleClick = (event: React.MouseEvent) => {
    const target = event.target as HTMLElement | null;
    if (
      target?.closest('.react-flow__node') ||
      target?.closest('.react-flow__panel') ||
      target?.closest('.react-flow__edge')
    ) {
      return;
    }

    openQuickAddMenu({
      clientX: event.clientX,
      clientY: event.clientY,
    });
  };

  const handlePaneClick = (event: React.MouseEvent) => {
    if (event.detail >= 2) {
      handlePaneDoubleClick(event);
      return;
    }

    setExpandedImagePickerNodeId(null);

    if (quickAddMenu) {
      setQuickAddMenu(null);
    }
  };

  const handleNodeContextMenu = (
    event: React.MouseEvent,
    node: CanvasFlowNode
  ) => {
    event.preventDefault();
    event.stopPropagation();
    openQuickAddMenu({
      clientX: event.clientX,
      clientY: event.clientY,
      mode: 'node',
      nodeId: node.id,
    });
  };

  const handleEdgeContextMenu = (event: React.MouseEvent, edge: Edge) => {
    event.preventDefault();
    event.stopPropagation();
    openQuickAddMenu({
      clientX: event.clientX,
      clientY: event.clientY,
      mode: 'edge',
      edgeId: edge.id,
    });
  };

  const handlePaneContextMenu = (
    event: MouseEvent | React.MouseEvent<Element, MouseEvent>
  ) => {
    event.preventDefault();
    openQuickAddMenu({
      clientX: event.clientX,
      clientY: event.clientY,
      mode: 'pane',
    });
  };

  const handleConnect = (connection: Connection) => {
    const result = connectNodes(connection);
    if (!result.ok) {
      toast.error(translateCanvasRuntimeMessage(t, result.message));
    }
  };

  const handleNodeDoubleClick = (
    _event: React.MouseEvent,
    node: CanvasFlowNode
  ) => {
    const nodeWidth = node.measured?.width || node.width || 340;
    const nodeHeight = node.measured?.height || node.height || 260;
    const currentViewport = reactFlow.getViewport();

    void reactFlow.setCenter(
      node.position.x + nodeWidth / 2,
      node.position.y + nodeHeight / 2,
      {
        zoom: currentViewport.zoom,
        duration: 180,
      }
    );
  };

  const handleSaveTitle = async () => {
    const nextTitle = title.trim();
    if (!nextTitle) {
      toast.error(canvasT(t, 'toast.canvasTitleRequired'));
      setTitle(savedTitle);
      return;
    }

    if (nextTitle === savedTitle) {
      setIsEditingCanvasTitle(false);
      return;
    }

    try {
      setIsSavingTitle(true);
      const response = await fetch(`/api/canvas/${initialCanvas.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title: nextTitle }),
      });

      if (!response.ok) {
        throw new Error(`request failed with status ${response.status}`);
      }

      const json = await response.json();
      if (json.code !== 0 || !json.data?.canvas) {
        throw new Error(
          translateCanvasRuntimeMessage(
            t,
            json.message || '',
            'runtime.renameCanvasFailed'
          )
        );
      }

      setTitle(localizeCanvasTitle(t, json.data.canvas.title));
      setSavedTitle(localizeCanvasTitle(t, json.data.canvas.title));
      setIsEditingCanvasTitle(false);
    } catch (error) {
      console.error('rename canvas failed', error);
      toast.error(
        error instanceof Error
          ? translateCanvasRuntimeMessage(
              t,
              error.message,
              'toast.renameCanvasFailed'
            )
          : canvasT(t, 'toast.renameCanvasFailed')
      );
    } finally {
      setIsSavingTitle(false);
    }
  };

  const handleReloadLatest = async () => {
    try {
      setIsReloading(true);
      const response = await fetch(`/api/canvas/${initialCanvas.id}`);

      if (!response.ok) {
        throw new Error(`request failed with status ${response.status}`);
      }

      const json = await response.json();
      if (json.code !== 0 || !json.data?.canvas) {
        throw new Error(
          translateCanvasRuntimeMessage(
            t,
            json.message || '',
            'runtime.reloadCanvasFailed'
          )
        );
      }

      const latestCanvas = json.data.canvas as CanvasDocumentRecord;
      hydrate(latestCanvas);
      setTitle(localizeCanvasTitle(t, latestCanvas.title));
      setSavedTitle(localizeCanvasTitle(t, latestCanvas.title));
      setLiveViewport(normalizeCanvasViewport(latestCanvas.graph.viewport));
      await reactFlow.setViewport(
        normalizeCanvasViewport(latestCanvas.graph.viewport),
        {
          duration: 0,
        }
      );
      toast.success(canvasT(t, 'toast.loadedLatestCanvas'));
    } catch (error) {
      console.error('reload canvas failed', error);
      toast.error(
        error instanceof Error
          ? translateCanvasRuntimeMessage(
              t,
              error.message,
              'toast.reloadCanvasFailed'
            )
          : canvasT(t, 'toast.reloadCanvasFailed')
      );
    } finally {
      setIsReloading(false);
    }
  };

  const handleNodePatch = ({
    patch,
    revision: nextRevision,
  }: {
    patch: CanvasNodePatch;
    revision?: number | null;
  }) => {
    applyServerNodePatch({
      patch,
      revision: nextRevision,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleCopyNode = (nodeId: string) => {
    const result = duplicateNode(nodeId);
    if (!result.ok) {
      toast.error(translateCanvasRuntimeMessage(t, result.message));
      return;
    }

    setQuickAddMenu(null);
  };

  const handleDeleteNode = (nodeId: string) => {
    deleteNode(nodeId);
    setQuickAddMenu(null);
  };

  const handleDeleteEdge = (edgeId: string) => {
    deleteEdge(edgeId);
    setQuickAddMenu(null);
  };

  const startRunPolling = ({
    runId,
    nodeId,
    nodeType,
    quiet = false,
  }: {
    runId: string;
    nodeId: string;
    nodeType: CanvasNodeType;
    quiet?: boolean;
  }) => {
    if (runPollingTimersRef.current.has(runId)) {
      return;
    }

    const poll = async () => {
      try {
        const response = await fetch(
          `/api/canvas/${initialCanvas.id}/runs/${runId}`
        );
        if (!response.ok) {
          throw new Error(`request failed with status ${response.status}`);
        }

        const json = await response.json();
        if (json.code !== 0 || !json.data?.run) {
          throw new Error(json.message || 'task_query_failed');
        }

        if (json.data.nodePatch) {
          handleNodePatch({
            patch: json.data.nodePatch,
            revision:
              typeof json.data.revision === 'number'
                ? json.data.revision
                : null,
          });
        }

        const runStatus = String(json.data.run.status || '');
        if (runStatus === 'success') {
          runPollingTimersRef.current.delete(runId);
          void fetchUserCredits();
          toast.success(canvasT(t, 'toast.nodeGenerationDone'));
          return;
        }

        if (runStatus === 'failed' || runStatus === 'canceled') {
          runPollingTimersRef.current.delete(runId);
          void fetchUserCredits();
          const message =
            typeof json.data.run.errorMessage === 'string' &&
            json.data.run.errorMessage
              ? translateCanvasRuntimeMessage(t, json.data.run.errorMessage)
              : canvasT(t, 'toast.nodeGenerationFailed');
          updateNodeData(nodeId, {
            status: 'error',
            errorMessage: message,
          } as Partial<CanvasNodeData>);
          toast.error(message);
          return;
        }

        const nextDelay = nodeType === 'video' ? 15000 : 5000;
        const timeoutId = window.setTimeout(() => {
          void poll();
        }, nextDelay);
        runPollingTimersRef.current.set(runId, timeoutId);
      } catch (error) {
        runPollingTimersRef.current.delete(runId);
        if (!quiet) {
          toast.error(
            error instanceof Error
              ? translateCanvasRuntimeMessage(
                  t,
                  error.message,
                  'toast.refreshNodeStatusFailed'
                )
              : canvasT(t, 'toast.refreshNodeStatusFailed')
          );
        }
      }
    };

    const initialDelay = nodeType === 'video' ? 5000 : 2500;
    const timeoutId = window.setTimeout(() => {
      void poll();
    }, initialDelay);
    runPollingTimersRef.current.set(runId, timeoutId);
  };

  useEffect(() => {
    for (const node of nodes) {
      const nodeData = node.data;
      if (
        (nodeData.status === 'queued' || nodeData.status === 'running') &&
        nodeData.lastRunId
      ) {
        startRunPolling({
          runId: nodeData.lastRunId,
          nodeId: node.id,
          nodeType: nodeData.nodeType,
          quiet: true,
        });
      }
    }
  }, [nodes]);

  const handleExecuteSelectedNode = async () => {
    if (!selectedNode || !selectedNodeData) {
      toast.error(canvasT(t, 'toast.selectSingleNode'));
      return;
    }

    if (
      (selectedNodeData.nodeType === 'image' ||
        selectedNodeData.nodeType === 'video') &&
      getMediaInputMode(selectedNodeData) === 'upload'
    ) {
      toast.error(canvasT(t, 'toast.switchToGenerateMode'));
      return;
    }

    if (
      selectedNodeData.status === 'queued' ||
      selectedNodeData.status === 'running'
    ) {
      toast.error(canvasT(t, 'toast.nodeAlreadyRunning'));
      return;
    }

    try {
      setExecutingNodeId(selectedNode.id);
      const nextRevision = await saveGraphNow();

      const response = await fetch(
        `/api/canvas/${initialCanvas.id}/nodes/${selectedNode.id}/execute`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            revision: nextRevision,
            triggerType: 'manual',
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`request failed with status ${response.status}`);
      }

      const json = await response.json();
      if (json.code !== 0 || !json.data?.run) {
        throw new Error(
          translateCanvasRuntimeMessage(
            t,
            json.message || '',
            'runtime.generateFailed'
          )
        );
      }

      if (json.data.nodePatch) {
        handleNodePatch({
          patch: json.data.nodePatch,
          revision:
            typeof json.data.revision === 'number' ? json.data.revision : null,
        });
      }

      const runStatus = String(json.data.run.status || '');
      if (runStatus === 'success') {
        void fetchUserCredits();
        toast.success(canvasT(t, 'toast.nodeGenerationDone'));
        return;
      }

      if (!isFinalCanvasRunStatus(runStatus as never)) {
        toast.success(canvasT(t, 'toast.nodeRunStarted'));
        startRunPolling({
          runId: json.data.run.id,
          nodeId: selectedNode.id,
          nodeType: selectedNodeData.nodeType,
        });
      }

      void fetchUserCredits();
    } catch (error) {
      console.error('execute canvas node failed', error);
      const message =
        error instanceof Error
          ? translateCanvasRuntimeMessage(
              t,
              error.message,
              'toast.executeNodeFailed'
            )
          : canvasT(t, 'toast.executeNodeFailed');
      updateNodeData(selectedNode.id, {
        status: 'error',
        errorMessage: message,
      } as Partial<CanvasNodeData>);
      toast.error(message);
    } finally {
      setExecutingNodeId(null);
    }
  };

  const handleSelectedNodeChange = (patch: Partial<CanvasNodeData>) => {
    if (!selectedNode || !selectedNodeData) {
      return;
    }

    updateNodeData(selectedNode.id, patch);
    if (shouldPersistCanvasPreferencePatch(patch)) {
      persistCanvasNodePreferences(selectedNodeData, patch);
    }
  };

  const handleSelectedImageModelChange = (value: string) => {
    if (!selectedNodeData || selectedNodeData.nodeType !== 'image') {
      return;
    }

    handleSelectedNodeChange(
      normalizeCanvasImageNodeSettingsForModel(selectedNodeData, value)
    );
  };

  const handleSelectedMediaModeChange = (value: string) => {
    if (
      !selectedNodeData ||
      (selectedNodeData.nodeType !== 'image' &&
        selectedNodeData.nodeType !== 'video' &&
        selectedNodeData.nodeType !== 'audio')
    ) {
      return;
    }

    handleSelectedNodeChange({
      inputMode: value === 'upload' ? 'upload' : 'generate',
    } as Partial<CanvasNodeData>);
  };

  const handleSelectedAudioUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file || !selectedNode || selectedNodeData?.nodeType !== 'audio') {
      return;
    }

    const formData = new FormData();
    formData.append('files', file);

    try {
      setIsUploadingAudio(true);
      const response = await fetch('/api/storage/upload-audio', {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) {
        throw new Error(`request failed with status ${response.status}`);
      }

      const json = await response.json();
      const url = json.data?.urls?.[0];
      if (json.code !== 0 || typeof url !== 'string' || !url) {
        throw new Error(json.message || 'upload_audio_failed');
      }

      updateNodeData(selectedNode.id, {
        audio: {
          url,
          source: 'uploaded',
          mimeType: file.type || null,
          size: file.size,
        },
        inputMode: 'upload',
        status: 'success',
        errorMessage: null,
      } as Partial<CanvasNodeData>);
      toast.success(canvasT(t, 'toast.audioUploadSuccess'));
    } catch (error) {
      console.error('upload canvas audio failed', error);
      toast.error(
        error instanceof Error
          ? translateCanvasRuntimeMessage(
              t,
              error.message,
              'toast.audioUploadFailed'
            )
          : canvasT(t, 'toast.audioUploadFailed')
      );
    } finally {
      setIsUploadingAudio(false);
    }
  };

  const handleRemoveReference = (edgeId: string) => {
    deleteEdge(edgeId);
  };

  const handleInsertReferenceToken = (token: string) => {
    if (!selectedNodeData) {
      return;
    }

    const nextPrompt = selectedNodeData.prompt.trim().length
      ? `${selectedNodeData.prompt.replace(/\s*$/, '')} ${token}`
      : token;

    handleSelectedNodeChange({
      prompt: nextPrompt,
    } as Partial<CanvasNodeData>);
  };

  const handlePreviewImageSelect = (index: number) => {
    setImagePreview((current) => {
      if (!current) {
        return current;
      }

      const nextIndex = clampCanvasImageIndex(
        index,
        current.images.length,
        current.activeIndex
      );
      const nextImage = current.images[nextIndex];
      if (current.nodeId && nextImage) {
        updateNodeData(current.nodeId, {
          image: nextImage,
          selectedImageIndex: nextIndex,
        } as Partial<CanvasNodeData>);
      }

      return {
        ...current,
        activeIndex: nextIndex,
      };
    });
  };

  const handleCopyPreviewImage = useCallback(async () => {
    if (!activePreviewImage?.url || isCopyingPreviewImage) {
      return;
    }

    if (
      typeof navigator === 'undefined' ||
      !navigator.clipboard ||
      typeof navigator.clipboard.write !== 'function' ||
      typeof ClipboardItem === 'undefined'
    ) {
      toast.error(canvasT(t, 'toast.imageCopyFailed'));
      return;
    }

    setIsCopyingPreviewImage(true);
    try {
      const response = await fetch(activePreviewImageProxyUrl || '');
      if (!response.ok) {
        throw new Error(`copy_image_fetch_failed_${response.status}`);
      }

      const blob = await response.blob();
      const blobType = blob.type || 'image/png';
      await navigator.clipboard.write([
        new ClipboardItem({
          [blobType]: blob,
        }),
      ]);
      toast.success(canvasT(t, 'toast.imageCopied'));
    } catch (error) {
      console.error('Failed to copy canvas preview image:', error);
      toast.error(canvasT(t, 'toast.imageCopyFailed'));
    } finally {
      setIsCopyingPreviewImage(false);
    }
  }, [activePreviewImageProxyUrl, isCopyingPreviewImage, t]);

  const handleCopyTemplateLink = useCallback(async () => {
    if (
      !publishedTemplateUrl ||
      !navigator.clipboard ||
      typeof navigator.clipboard.writeText !== 'function'
    ) {
      toast.error(canvasT(t, 'toast.templateLinkCopyFailed'));
      return;
    }

    try {
      await navigator.clipboard.writeText(publishedTemplateUrl);
      toast.success(canvasT(t, 'toast.templateLinkCopied'));
    } catch (error) {
      console.error('copy canvas template link failed', error);
      toast.error(canvasT(t, 'toast.templateLinkCopyFailed'));
    }
  }, [publishedTemplateUrl, t]);

  const handleShareTemplate = useCallback(async () => {
    if (conflictDetected) {
      toast.error(canvasT(t, 'runtime.conflictLoadLatest'));
      return;
    }

    const validation = validateCanvasGraph(graph);
    if (!validation.ok) {
      toast.error(translateCanvasRuntimeMessage(t, validation.message));
      return;
    }

    try {
      setIsPublishingTemplate(true);
      const response = await fetch(`/api/canvas/${initialCanvas.id}/template`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title:
            title.trim() || savedTitle.trim() || buildUntitledCanvasTitle(t),
          graph,
        }),
      });

      if (!response.ok) {
        throw new Error(`request failed with status ${response.status}`);
      }

      const json = await response.json();
      const shareKey = String(json.data?.template?.shareKey || '').trim();
      if (json.code !== 0 || !shareKey) {
        throw new Error(
          translateCanvasRuntimeMessage(
            t,
            json.message || '',
            'toast.shareTemplateFailed'
          )
        );
      }

      const nextTemplateUrl = `${window.location.origin}/${locale}/canvas/template/${shareKey}`;
      setPublishedTemplateUrl(nextTemplateUrl);
      setIsTemplateDialogOpen(true);
      toast.success(canvasT(t, 'toast.shareTemplateSuccess'));

      if (
        navigator.clipboard &&
        typeof navigator.clipboard.writeText === 'function'
      ) {
        try {
          await navigator.clipboard.writeText(nextTemplateUrl);
          toast.success(canvasT(t, 'toast.templateLinkCopied'));
        } catch (error) {
          console.error('copy canvas template link failed', error);
        }
      }
    } catch (error) {
      console.error('share canvas template failed', error);
      toast.error(
        error instanceof Error
          ? translateCanvasRuntimeMessage(
              t,
              error.message,
              'toast.shareTemplateFailed'
            )
          : canvasT(t, 'toast.shareTemplateFailed')
      );
    } finally {
      setIsPublishingTemplate(false);
    }
  }, [conflictDetected, graph, initialCanvas.id, locale, savedTitle, t, title]);

  const handleCanvasZoomChange = (nextZoomPercent: number) => {
    const zoom =
      Math.min(
        CANVAS_MAX_ZOOM_PERCENT,
        Math.max(CANVAS_MIN_ZOOM_PERCENT, nextZoomPercent)
      ) / 100;
    const currentViewport = reactFlow.getViewport();
    const containerRect = canvasViewportRef.current?.getBoundingClientRect();
    const nextViewport = {
      x: currentViewport.x,
      y: currentViewport.y,
      zoom: currentViewport.zoom,
    };

    if (containerRect) {
      const viewportCenter = reactFlow.screenToFlowPosition({
        x: containerRect.left + containerRect.width / 2,
        y: containerRect.top + containerRect.height / 2,
      });

      void reactFlow.setCenter(viewportCenter.x, viewportCenter.y, {
        zoom,
        duration: 120,
      });
      const centerX = containerRect.width / 2;
      const centerY = containerRect.height / 2;
      nextViewport.zoom = zoom;
      nextViewport.x = centerX - viewportCenter.x * zoom;
      nextViewport.y = centerY - viewportCenter.y * zoom;
    } else {
      nextViewport.zoom = zoom;
      void reactFlow.setViewport(nextViewport, { duration: 120 });
    }

    setLiveViewport(nextViewport);
    updateViewport(nextViewport);
  };

  const createMediaNodeFromFile = async ({
    file,
    nodeType,
    position,
  }: {
    file: File;
    nodeType: 'image' | 'video';
    position: { x: number; y: number };
  }) => {
    const result = handleAddNode(nodeType, position);
    if (!result.ok) {
      return;
    }

    const baseTitle =
      file.name.replace(/\.[^.]+$/, '') ||
      `${getCanvasNodeTypeLabel(t, nodeType)}${canvasT(t, 'common.upload')}`;
    updateNodeData(result.nodeId, {
      title: baseTitle,
      inputMode: 'upload',
      status: 'running',
      errorMessage: null,
    } as Partial<CanvasNodeData>);

    try {
      if (nodeType === 'image') {
        if (!IMAGE_ACCEPT.split(',').includes(file.type)) {
          throw new Error(canvasT(t, 'runtime.unsupportedImageFormat'));
        }
        if (file.size <= 0) {
          throw new Error(canvasT(t, 'runtime.emptyImage'));
        }
        if (file.size > MAX_IMAGE_SIZE_BYTES) {
          throw new Error(canvasT(t, 'runtime.imageTooLarge'));
        }

        const dimensions = await getImageFileDimensions(file);
        const currentNode = useCanvasStore
          .getState()
          .nodes.find((item) => item.id === result.nodeId);
        const inferredAspectRatio =
          currentNode?.data.nodeType === 'image'
            ? pickClosestCanvasAspectRatio({
                ...dimensions,
                options: getCanvasImageAspectRatioOptions(currentNode.data),
              })
            : null;
        const uploadedMedia = await uploadCanvasImage(file);
        updateNodeData(result.nodeId, {
          image: {
            ...uploadedMedia,
            thumbnailUrl: uploadedMedia.thumbnailUrl || uploadedMedia.url,
            size: file.size,
          },
          imageOutputs: [
            {
              ...uploadedMedia,
              thumbnailUrl: uploadedMedia.thumbnailUrl || uploadedMedia.url,
              size: file.size,
            },
          ],
          selectedImageIndex: 0,
          ...(inferredAspectRatio ? { aspectRatio: inferredAspectRatio } : {}),
          inputMode: 'upload',
          status: 'success',
          errorMessage: null,
        } as Partial<CanvasNodeData>);
      } else {
        if (!VIDEO_ACCEPT.split(',').includes(file.type)) {
          throw new Error(canvasT(t, 'runtime.unsupportedVideoFormat'));
        }
        if (file.size <= 0) {
          throw new Error(canvasT(t, 'runtime.emptyVideo'));
        }
        if (file.size > MAX_VIDEO_SIZE_BYTES) {
          throw new Error(canvasT(t, 'runtime.videoTooLarge'));
        }

        const durationSec = await getVideoDuration(file);
        const uploadedMedia = await uploadCanvasVideo(file, durationSec);
        updateNodeData(result.nodeId, {
          video: {
            ...uploadedMedia,
            durationSec: uploadedMedia.durationSec ?? durationSec,
            size: file.size,
          },
          videoHistory: [
            {
              ...uploadedMedia,
              durationSec: uploadedMedia.durationSec ?? durationSec,
              size: file.size,
            },
          ],
          selectedVideoIndex: 0,
          inputMode: 'upload',
          status: 'success',
          errorMessage: null,
        } as Partial<CanvasNodeData>);
      }
    } catch (error) {
      updateNodeData(result.nodeId, {
        status: 'error',
        errorMessage:
          error instanceof Error
            ? translateCanvasRuntimeMessage(
                t,
                error.message,
                'runtime.canvasMediaUploadFailed'
              )
            : canvasT(t, 'runtime.canvasMediaUploadFailed'),
      } as Partial<CanvasNodeData>);
      throw error;
    }
  };

  const createTextNodeFromFile = async ({
    file,
    position,
  }: {
    file: File;
    position: { x: number; y: number };
  }) => {
    const result = handleAddNode('text', position);
    if (!result.ok) {
      return;
    }

    const text = await file.text();
    const baseTitle =
      file.name.replace(/\.[^.]+$/, '') ||
      `${canvasT(t, 'common.textNodeLabel')}${canvasT(t, 'common.upload')}`;
    updateNodeData(result.nodeId, {
      title: baseTitle,
      plainText: text,
      status: 'success',
      errorMessage: null,
    } as Partial<CanvasNodeData>);
  };

  const createAudioNodeFromFile = async ({
    file,
    position,
  }: {
    file: File;
    position: { x: number; y: number };
  }) => {
    if (
      !['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav'].includes(
        file.type
      )
    ) {
      throw new Error(canvasT(t, 'runtime.audioFormatUnsupported'));
    }

    const result = handleAddNode('audio', position);
    if (!result.ok) {
      return;
    }

    const formData = new FormData();
    formData.append('files', file);

    updateNodeData(result.nodeId, {
      title:
        file.name.replace(/\.[^.]+$/, '') ||
        `${canvasT(t, 'common.audioNodeLabel')}${canvasT(t, 'common.upload')}`,
      status: 'running',
      errorMessage: null,
    } as Partial<CanvasNodeData>);

    try {
      const response = await fetch('/api/storage/upload-audio', {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) {
        throw new Error(`request failed with status ${response.status}`);
      }

      const json = await response.json();
      const url = json.data?.urls?.[0];
      if (json.code !== 0 || typeof url !== 'string' || !url) {
        throw new Error(json.message || 'upload_audio_failed');
      }

      updateNodeData(result.nodeId, {
        audio: {
          url,
          source: 'uploaded',
          mimeType: file.type || null,
          size: file.size,
        },
        inputMode: 'upload',
        status: 'success',
        errorMessage: null,
      } as Partial<CanvasNodeData>);
    } catch (error) {
      updateNodeData(result.nodeId, {
        status: 'error',
        errorMessage:
          error instanceof Error
            ? translateCanvasRuntimeMessage(
                t,
                error.message,
                'runtime.canvasAudioUploadFailed'
              )
            : canvasT(t, 'runtime.canvasAudioUploadFailed'),
      } as Partial<CanvasNodeData>);
      throw error;
    }
  };

  const saveToneClass = conflictDetected
    ? 'text-amber-200'
    : saveStatus === 'saving'
      ? 'text-sky-200'
      : saveStatus === 'error'
        ? 'text-rose-200'
        : isDirty
          ? 'text-white'
          : 'text-emerald-200';
  const saveLabel = conflictDetected
    ? canvasT(t, 'studio.saveConflict')
    : saveStatus === 'saving'
      ? canvasT(t, 'studio.saving')
      : saveStatus === 'error'
        ? canvasT(t, 'studio.saveError')
        : isDirty
          ? canvasT(t, 'studio.unsavedChanges')
          : canvasT(t, 'studio.allSaved');
  const saveInlineMeta = conflictDetected
    ? canvasT(t, 'studio.loadLatestVersion')
    : saveStatus === 'error'
      ? saveError
        ? translateCanvasRuntimeMessage(t, saveError)
        : canvasT(t, 'studio.retryNeeded')
      : saveStatus === 'saving'
        ? canvasT(t, 'studio.graphAndViewport')
        : isDirty
          ? canvasT(t, 'studio.waitingAutoSave')
          : lastSavedAt
            ? formatDateTime(locale, t, lastSavedAt)
            : canvasT(t, 'studio.waitingFirstSave');
  const executionError =
    selectedDescriptor &&
    'ok' in selectedDescriptor &&
    selectedDescriptor.ok === false &&
    selectedDescriptor.code !== 'prompt_required'
      ? translateCanvasRuntimeMessage(t, selectedDescriptor.message)
      : null;
  const selectedNodePromptPlaceholder = selectedNodeData
    ? selectedNodeData.nodeType === 'text'
      ? canvasT(t, 'studio.promptPlaceholderText')
      : selectedNodeData.nodeType === 'image' &&
          isMidjourneyCanvasImageModel(selectedNodeData.model)
        ? canvasT(t, 'studio.promptPlaceholderImage')
        : selectedNodeData.nodeType === 'audio'
          ? canvasT(t, 'studio.promptPlaceholderAudio')
          : canvasT(t, 'studio.promptPlaceholderGeneric', {
              nodeType: getCanvasNodeTypeLabel(t, selectedNodeData.nodeType),
            })
    : '';
  const selectedNodeEditorOverlay = useMemo(() => {
    if (!selectedNode || !selectedNodeData || !canvasViewportRef.current) {
      return null;
    }

    const nodeWidth = selectedNode.measured?.width || selectedNode.width || 340;
    const nodeHeight =
      selectedNode.measured?.height || selectedNode.height || 260;
    const containerWidth = canvasViewportRef.current.clientWidth;
    const overlayWidth = Math.min(820, Math.max(360, containerWidth - 32));
    const centerX =
      selectedNode.position.x * liveViewport.zoom +
      liveViewport.x +
      (nodeWidth * liveViewport.zoom) / 2;
    const nodeBottom =
      selectedNode.position.y * liveViewport.zoom +
      liveViewport.y +
      nodeHeight * liveViewport.zoom;

    return {
      left: centerX,
      top: nodeBottom + 18,
      width: overlayWidth,
    };
  }, [
    liveViewport.x,
    liveViewport.y,
    liveViewport.zoom,
    selectedNode,
    selectedNodeData,
  ]);
  const selectedEditableImage =
    selectedNode && selectedNodeData?.nodeType === 'image'
      ? (() => {
          const selectedMedia = selectedImageMediaByNodeIdRef.current.get(
            selectedNode.id
          );
          if (selectedMedia?.url) {
            return {
              media: selectedMedia,
              title: localizeCanvasNodeTitle(
                t,
                selectedNodeData.nodeType,
                selectedNodeData.title
              ),
            };
          }

          return getEditableCanvasImage(t, selectedNodeData);
        })()
      : null;
  const selectedNodeActionOverlay = useMemo(() => {
    if (
      !selectedNode ||
      !selectedNodeData ||
      !selectedEditableImage ||
      !canvasViewportRef.current
    ) {
      return null;
    }

    const nodeWidth = selectedNode.measured?.width || selectedNode.width || 340;
    const nodeTop =
      selectedNode.position.y * liveViewport.zoom + liveViewport.y;
    const centerX =
      selectedNode.position.x * liveViewport.zoom +
      liveViewport.x +
      (nodeWidth * liveViewport.zoom) / 2;

    return {
      left: centerX,
      top: nodeTop - 12,
    };
  }, [
    liveViewport.x,
    liveViewport.y,
    liveViewport.zoom,
    selectedEditableImage,
    selectedNode,
    selectedNodeData,
  ]);

  const handleConnectEnd = (
    event: MouseEvent | TouchEvent,
    connectionState: FinalConnectionState
  ) => {
    if (
      !connectionState.fromNode ||
      !connectionState.from ||
      connectionState.toNode
    ) {
      return;
    }

    const target = event.target as HTMLElement | null;
    if (!target?.closest('.react-flow__pane')) {
      return;
    }

    const point = getClientPoint(event, connectionState.pointer || undefined);
    openQuickAddMenu({
      clientX: point.x,
      clientY: point.y,
      mode: 'connection',
      pendingConnection: {
        sourceNodeId: connectionState.fromNode.id,
        sourceNodeType: connectionState.fromNode.type as CanvasNodeType,
        sourceHandleId:
          connectionState.fromHandle?.id === 'right' ||
          connectionState.fromHandle?.id === 'style-reference' ||
          connectionState.fromHandle?.id === 'omni-reference'
            ? (connectionState.fromHandle.id as CanvasConnectionHandleId)
            : 'left',
      },
    });
  };

  return (
    <div className="dark flex h-dvh min-h-dvh w-full flex-col overflow-hidden bg-black text-white">
      <div className="shrink-0 border-b border-white/10 bg-black/88 px-4 py-3 backdrop-blur md:px-6">
        <div className="mx-auto flex max-w-[1720px] flex-wrap items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="text-white hover:bg-white/10 hover:text-white"
          >
            <Link href="/canvas">
              <ArrowLeft />
              {canvasT(t, 'common.back')}
            </Link>
          </Button>

          <Badge className="bg-white/10 text-white hover:bg-white/10">
            {canvasT(t, 'studio.workspace')}
          </Badge>

          <div className="w-full min-w-[180px] flex-1 md:max-w-[420px]">
            {isEditingCanvasTitle ? (
              <Input
                autoFocus
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                onBlur={() => void handleSaveTitle()}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    (event.currentTarget as HTMLInputElement).blur();
                  }
                  if (event.key === 'Escape') {
                    event.preventDefault();
                    setTitle(savedTitle);
                    setIsEditingCanvasTitle(false);
                  }
                }}
                className="h-10 border-white/15 bg-white/5 px-3 text-base font-medium text-white placeholder:text-white/35"
                placeholder={canvasT(t, 'common.untitledCanvas')}
                disabled={isSavingTitle}
              />
            ) : (
              <button
                type="button"
                onClick={() => setIsEditingCanvasTitle(true)}
                className="inline-flex h-10 max-w-full cursor-text items-center rounded-xl px-2 text-left text-lg font-semibold text-white transition hover:bg-white/[0.04]"
              >
                <span className="truncate">
                  {title || buildUntitledCanvasTitle(t)}
                </span>
              </button>
            )}
          </div>

          <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-medium text-white">
              <Coins className="size-3.5 text-white/70" />
              <span>{user ? remainingCredits : '--'}</span>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-2 text-xs">
              {(saveStatus === 'saving' || isSavingTitle) && (
                <LoaderCircle className="size-3.5 animate-spin text-sky-200" />
              )}
              <span className={cn('font-medium', saveToneClass)}>
                {isSavingTitle ? canvasT(t, 'studio.savingTitle') : saveLabel}
              </span>
              <span className="text-white/20">•</span>
              <span className="text-white/50">{saveInlineMeta}</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void handleShareTemplate()}
              disabled={isPublishingTemplate}
              className="border-white/10 bg-white/[0.03] text-white hover:bg-white/10 hover:text-white"
            >
              {isPublishingTemplate ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <Share2 className="size-4" />
              )}
              {isPublishingTemplate
                ? canvasT(t, 'studio.sharingTemplate')
                : canvasT(t, 'studio.shareTemplate')}
            </Button>
            {conflictDetected ? (
              <Button
                variant="outline"
                size="sm"
                onClick={handleReloadLatest}
                disabled={isReloading}
                className="border-amber-400/25 bg-amber-500/10 text-amber-100 hover:bg-amber-500/15 hover:text-amber-50"
              >
                <RefreshCw className={cn(isReloading && 'animate-spin')} />
                {isReloading
                  ? canvasT(t, 'studio.loadingVersion')
                  : canvasT(t, 'studio.loadLatestVersion')}
              </Button>
            ) : null}
          </div>

          {conflictDetected ? (
            <div className="flex w-full flex-col gap-3 rounded-[24px] border border-amber-400/20 bg-amber-500/10 px-4 py-4 md:flex-row md:items-center md:justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-amber-100">
                  {canvasT(t, 'studio.conflictBannerTitle')}
                </p>
                <p className="text-sm text-amber-100/75">
                  {canvasT(t, 'studio.conflictBannerDescription')}
                </p>
              </div>
              <Button
                size="sm"
                onClick={handleReloadLatest}
                disabled={isReloading}
                className="bg-amber-100 text-amber-950 hover:bg-amber-50"
              >
                <RefreshCw className={cn(isReloading && 'animate-spin')} />
                {isReloading
                  ? canvasT(t, 'studio.loadingVersion')
                  : canvasT(t, 'studio.loadLatestVersion')}
              </Button>
            </div>
          ) : null}
        </div>
      </div>

      <div
        ref={canvasViewportRef}
        className={cn(
          'canvas-studio relative min-h-0 flex-1',
          isPanning && 'is-panning'
        )}
      >
        <ReactFlow<CanvasFlowNode, Edge>
          className="bg-[#070707]"
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          connectionMode={ConnectionMode.Loose}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={handleConnect}
          onConnectEnd={handleConnectEnd}
          onPaneClick={handlePaneClick}
          onPaneContextMenu={handlePaneContextMenu}
          onNodeDoubleClick={handleNodeDoubleClick}
          onNodeContextMenu={handleNodeContextMenu}
          onEdgeContextMenu={handleEdgeContextMenu}
          onMove={(_event, nextViewport) => setLiveViewport(nextViewport)}
          onMoveEnd={(_event, nextViewport) => {
            setLiveViewport(nextViewport);
            updateViewport(nextViewport);
          }}
          defaultEdgeOptions={{
            type: 'default',
            style: {
              stroke: 'rgba(255,255,255,0.2)',
              strokeWidth: 1.4,
            },
          }}
          panOnDrag={[1, 2]}
          zoomOnScroll={false}
          selectionOnDrag
          selectionMode={SelectionMode.Partial}
          fitView={nodes.length === 0}
          minZoom={0.25}
          maxZoom={1.8}
        >
          <Background
            gap={28}
            size={1}
            color="rgba(255,255,255,0.08)"
            bgColor="#070707"
          />

          <Panel
            position="top-left"
            className="!pointer-events-auto !mt-5 !ml-5"
          >
            <div className="rounded-[26px] border border-white/10 bg-[#101010]/92 p-2 shadow-[0_24px_60px_rgba(0,0,0,0.38)] backdrop-blur-xl">
              <div className="flex flex-col gap-2">
                <Button
                  size="icon"
                  onClick={(event) => {
                    const buttonRect =
                      event.currentTarget.getBoundingClientRect();

                    openQuickAddMenu({
                      clientX: buttonRect.left + buttonRect.width / 2,
                      clientY: buttonRect.bottom + 12,
                      align: 'center-trigger',
                    });
                  }}
                  disabled={conflictDetected}
                  className="rounded-2xl bg-white text-black hover:bg-white/90"
                >
                  <Plus className="size-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => handleAddNode('text')}
                  disabled={conflictDetected}
                  className="rounded-2xl text-white/75 hover:bg-white/10 hover:text-white"
                >
                  <Type className="size-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => handleAddNode('note')}
                  disabled={conflictDetected}
                  className="rounded-2xl text-white/75 hover:bg-white/10 hover:text-white"
                >
                  <StickyNote className="size-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => handleAddNode('image')}
                  disabled={conflictDetected}
                  className="rounded-2xl text-white/75 hover:bg-white/10 hover:text-white"
                >
                  <ImageIcon className="size-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => handleAddNode('video')}
                  disabled={conflictDetected}
                  className="rounded-2xl text-white/75 hover:bg-white/10 hover:text-white"
                >
                  <Video className="size-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => handleAddNode('audio')}
                  disabled={conflictDetected}
                  className="rounded-2xl text-white/75 hover:bg-white/10 hover:text-white"
                >
                  <AudioLines className="size-4" />
                </Button>
              </div>
            </div>
          </Panel>

          <Panel
            position="bottom-left"
            className="!pointer-events-auto !z-[80] !mb-5 !ml-5"
          >
            <div className="w-[172px] rounded-[20px] border border-white/10 bg-[#101010]/92 p-2.5 shadow-[0_20px_48px_rgba(0,0,0,0.34)] backdrop-blur-xl">
              {isMiniMapVisible ? (
                <div className="mb-2 overflow-hidden rounded-[14px] border border-white/10 bg-black/72">
                  <MiniMap
                    pannable
                    zoomable
                    nodeColor={(node) => {
                      const nodeData = node.data as CanvasNodeData;
                      if (nodeData.status === 'error') {
                        return '#fb7185';
                      }
                      if (
                        nodeData.status === 'running' ||
                        nodeData.status === 'queued'
                      ) {
                        return '#38bdf8';
                      }
                      if (nodeData.status === 'success') {
                        return '#34d399';
                      }
                      return '#f3f4f6';
                    }}
                    className="!static !m-0 !h-[88px] !w-full !border-0 !bg-transparent !shadow-none"
                  />
                </div>
              ) : null}
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setIsMiniMapVisible((value) => !value)}
                  className="inline-flex size-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-white/75 transition hover:bg-white/[0.06] hover:text-white"
                  aria-label={
                    isMiniMapVisible
                      ? canvasT(t, 'studio.hideMiniMap')
                      : canvasT(t, 'studio.showMiniMap')
                  }
                >
                  {isMiniMapVisible ? (
                    <X className="size-3.5" />
                  ) : (
                    <MapIcon className="size-3.5" />
                  )}
                </button>
                <span className="text-xs font-medium text-white/80">
                  {viewportZoomPercent}%
                </span>
              </div>
              <input
                type="range"
                min={CANVAS_MIN_ZOOM_PERCENT}
                max={CANVAS_MAX_ZOOM_PERCENT}
                step={1}
                value={viewportZoomPercent}
                onChange={(event) =>
                  handleCanvasZoomChange(Number(event.target.value))
                }
                className="mt-2 h-1.5 w-full cursor-pointer accent-white"
              />
            </div>
          </Panel>

          {selectedNodeActionOverlay &&
          selectedNode &&
          selectedEditableImage ? (
            <Panel
              position="top-left"
              className="!pointer-events-auto !m-0"
              style={{
                left: selectedNodeActionOverlay.left,
                top: selectedNodeActionOverlay.top,
                transform: 'translate(-50%, -100%)',
              }}
            >
              <div className="rounded-2xl border border-white/10 bg-[#111111]/95 p-1.5 shadow-[0_20px_56px_rgba(0,0,0,0.42)] backdrop-blur-xl">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    if (!selectedEditableImage) {
                      return;
                    }

                    setImageEditor({
                      sessionId:
                        typeof crypto !== 'undefined' &&
                        typeof crypto.randomUUID === 'function'
                          ? crypto.randomUUID()
                          : `${Date.now()}-${Math.random()}`,
                      nodeId: selectedNode.id,
                      media: selectedEditableImage.media,
                      title: selectedEditableImage.title,
                    });
                  }}
                  className="h-9 w-[104px] rounded-xl text-white/82 hover:bg-white/10 hover:text-white"
                >
                  <Pencil className="size-4" />
                  Edit
                </Button>
              </div>
            </Panel>
          ) : null}

          {selectedNodeEditorOverlay && selectedNodeData && selectedNode ? (
            <Panel
              position="top-left"
              className="!pointer-events-auto !m-0"
              style={{
                left: selectedNodeEditorOverlay.left,
                top: selectedNodeEditorOverlay.top,
                width: selectedNodeEditorOverlay.width,
                transform: 'translateX(-50%)',
              }}
            >
              <div className="rounded-[26px] border border-white/10 bg-[#111111]/95 p-3.5 shadow-[0_30px_80px_rgba(0,0,0,0.4)] backdrop-blur-xl">
                {selectedNodeData.nodeType === 'text' ? (
                  <div className="space-y-3">
                    <CanvasReferencesRail
                      references={selectedReferences}
                      onPreviewImage={setImagePreview}
                      onInsertToken={handleInsertReferenceToken}
                      onRemove={handleRemoveReference}
                      disableImageTokens={shouldDisableMjImageReferenceTokens}
                    />
                    <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_260px]">
                      <div className="rounded-[22px] border border-white/10 bg-black/35 p-3">
                        <Textarea
                          value={selectedNodeData.prompt}
                          onChange={(event) =>
                            handleSelectedNodeChange({
                              prompt: event.target.value,
                            })
                          }
                          onPointerDown={(event) => event.stopPropagation()}
                          className="min-h-[88px] rounded-[20px] border-white/10 bg-black/45 px-4 py-3 text-sm text-white placeholder:text-white/30"
                          placeholder={selectedNodePromptPlaceholder}
                        />
                      </div>

                      <div className="space-y-3 rounded-[22px] border border-white/10 bg-black/40 p-3">
                        <div className="space-y-2">
                          <Select
                            value={selectedNodeData.model}
                            onValueChange={(value) =>
                              handleSelectedNodeChange({
                                model: value,
                              })
                            }
                          >
                            <SelectTrigger className="h-12 border-white/10 bg-white/[0.04] text-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent
                              className={CANVAS_SELECT_CONTENT_CLASS}
                            >
                              {getNodeModelOptions(
                                selectedNodeData.nodeType
                              ).map((model) => (
                                <SelectItem
                                  key={model}
                                  value={model}
                                  textValue={getPublicModelLabel(model)}
                                  className="py-0.5"
                                >
                                  <ModelSelectOption
                                    model={model}
                                    label={getPublicModelLabel(model)}
                                  />
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <Button
                          className={cn(
                            'h-10 w-full rounded-full bg-white text-black hover:bg-white/90',
                            shouldShowSelectedCredits && 'justify-between'
                          )}
                          onClick={() => void handleExecuteSelectedNode()}
                          disabled={
                            conflictDetected ||
                            executingNodeId === selectedNode.id ||
                            selectedNodeData.status === 'queued' ||
                            selectedNodeData.status === 'running'
                          }
                        >
                          <span className="inline-flex min-w-0 items-center gap-2">
                            {executingNodeId === selectedNode.id ? (
                              <LoaderCircle className="animate-spin" />
                            ) : (
                              <Sparkles />
                            )}
                            {executingNodeId === selectedNode.id
                              ? canvasT(t, 'studio.generating')
                              : canvasT(t, 'studio.startGenerating')}
                          </span>
                          {!(executingNodeId === selectedNode.id) &&
                          shouldShowSelectedCredits ? (
                            <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-medium text-black/70">
                              <Coins className="size-3.5" />
                              {selectedGenerateCreditLabel}
                            </span>
                          ) : null}
                        </Button>

                        {(selectedNodeData.status === 'running' ||
                          selectedNodeData.status === 'queued') && (
                          <Progress
                            value={getNodeStatusProgress(
                              selectedNodeData.status
                            )}
                            className="h-1.5 bg-white/8 [&>[data-slot=progress-indicator]]:bg-sky-400"
                          />
                        )}
                      </div>
                    </div>
                  </div>
                ) : selectedNodeData.nodeType === 'note' ? (
                  <div className="rounded-[22px] border border-amber-200/12 bg-amber-200/[0.05] p-3 text-sm leading-6 text-white/70">
                    {canvasT(t, 'studio.noteEditorHint')}
                  </div>
                ) : selectedNodeData.nodeType === 'audio' ? (
                  <div className="space-y-3">
                    <Tabs
                      value={selectedMediaMode || 'generate'}
                      onValueChange={handleSelectedMediaModeChange}
                    >
                      <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
                        <TabsList className="border-white/10 bg-black/35 text-white/55">
                          <TabsTrigger
                            value="generate"
                            className="data-[state=active]:bg-white data-[state=active]:text-black"
                          >
                            {canvasT(t, 'studio.modeGenerate')}
                          </TabsTrigger>
                          <TabsTrigger
                            value="upload"
                            className="data-[state=active]:bg-white data-[state=active]:text-black"
                          >
                            {canvasT(t, 'studio.modeUpload')}
                          </TabsTrigger>
                        </TabsList>
                        {selectedMediaMode === 'generate' ? (
                          <div className="min-w-0 flex-1">
                            <CanvasReferencesRail
                              references={selectedReferences}
                              onPreviewImage={setImagePreview}
                              onInsertToken={handleInsertReferenceToken}
                              onRemove={handleRemoveReference}
                              disableImageTokens={
                                shouldDisableMjImageReferenceTokens
                              }
                            />
                          </div>
                        ) : null}
                      </div>

                      <TabsContent value="generate" className="mt-3">
                        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_260px]">
                          <div className="space-y-3">
                            <Textarea
                              value={selectedNodeData.prompt}
                              onChange={(event) =>
                                handleSelectedNodeChange({
                                  prompt: event.target.value,
                                })
                              }
                              onPointerDown={(event) => event.stopPropagation()}
                              className="min-h-[88px] rounded-[20px] border-white/10 bg-black/45 px-4 py-3 text-sm text-white placeholder:text-white/30"
                              placeholder={selectedNodePromptPlaceholder}
                            />
                            <div className="grid gap-2 rounded-[22px] border border-white/10 bg-black/35 p-3 sm:grid-cols-2">
                              <div className="space-y-2">
                                <Label className="text-xs tracking-[0.2em] text-white/45 uppercase">
                                  {canvasT(t, 'studio.key')}
                                </Label>
                                <Select
                                  value={selectedNodeData.soundKey}
                                  onValueChange={(value) =>
                                    handleSelectedNodeChange({
                                      soundKey: value,
                                    })
                                  }
                                >
                                  <SelectTrigger className="border-white/10 bg-white/[0.04] text-white">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent
                                    className={CANVAS_SELECT_CONTENT_CLASS}
                                  >
                                    {AUDIO_KEY_OPTIONS.map((item) => (
                                      <SelectItem key={item} value={item}>
                                        {getCanvasSoundKeyLabel(t, item)}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2">
                                <Label className="text-xs tracking-[0.2em] text-white/45 uppercase">
                                  {canvasT(t, 'studio.tempo')}
                                </Label>
                                <Input
                                  value={selectedNodeData.soundTempo}
                                  onChange={(event) =>
                                    handleSelectedNodeChange({
                                      soundTempo: event.target.value,
                                    })
                                  }
                                  className="border-white/10 bg-white/[0.04] text-white placeholder:text-white/30"
                                  placeholder={canvasT(t, 'studio.optionalBpm')}
                                  inputMode="numeric"
                                />
                              </div>
                              <label className="inline-flex items-center gap-2 text-sm text-white/70 sm:col-span-2">
                                <input
                                  type="checkbox"
                                  checked={selectedNodeData.soundLoop}
                                  onChange={(event) =>
                                    handleSelectedNodeChange({
                                      soundLoop: event.target.checked,
                                    })
                                  }
                                  className="size-4 rounded border-white/20 bg-white/10"
                                />
                                {canvasT(t, 'studio.loopAudio')}
                              </label>
                            </div>
                          </div>

                          <div className="space-y-3 rounded-[22px] border border-white/10 bg-black/40 p-3">
                            <div className="space-y-2">
                              <Select
                                value={selectedNodeData.model}
                                onValueChange={(value) =>
                                  handleSelectedNodeChange({ model: value })
                                }
                              >
                                <SelectTrigger className="h-12 border-white/10 bg-white/[0.04] text-white">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent
                                  className={CANVAS_SELECT_CONTENT_CLASS}
                                >
                                  {getNodeModelOptions(
                                    selectedNodeData.nodeType
                                  ).map((model) => (
                                    <SelectItem
                                      key={model}
                                      value={model}
                                      textValue={getPublicModelLabel(model)}
                                      className="py-0.5"
                                    >
                                      <ModelSelectOption
                                        model={model}
                                        label={getPublicModelLabel(model)}
                                      />
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <Button
                              className={cn(
                                'h-10 w-full rounded-full bg-white text-black hover:bg-white/90',
                                shouldShowSelectedCredits && 'justify-between'
                              )}
                              onClick={() => void handleExecuteSelectedNode()}
                              disabled={
                                conflictDetected ||
                                executingNodeId === selectedNode.id ||
                                selectedNodeData.status === 'queued' ||
                                selectedNodeData.status === 'running'
                              }
                            >
                              <span className="inline-flex min-w-0 items-center gap-2">
                                {executingNodeId === selectedNode.id ? (
                                  <LoaderCircle className="animate-spin" />
                                ) : (
                                  <Sparkles />
                                )}
                                {executingNodeId === selectedNode.id
                                  ? canvasT(t, 'studio.generating')
                                  : canvasT(t, 'studio.startGenerating')}
                              </span>
                              {!(executingNodeId === selectedNode.id) &&
                              shouldShowSelectedCredits ? (
                                <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-medium text-black/70">
                                  <Coins className="size-3.5" />
                                  {selectedGenerateCreditLabel}
                                </span>
                              ) : null}
                            </Button>

                            {(selectedNodeData.status === 'running' ||
                              selectedNodeData.status === 'queued') && (
                              <Progress
                                value={getNodeStatusProgress(
                                  selectedNodeData.status
                                )}
                                className="h-1.5 bg-white/8 [&>[data-slot=progress-indicator]]:bg-sky-400"
                              />
                            )}
                          </div>
                        </div>
                      </TabsContent>

                      <TabsContent value="upload" className="mt-3">
                        <div className="rounded-[20px] border border-white/10 bg-black/35 p-2.5">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <Label className="text-xs tracking-[0.2em] text-white/45 uppercase">
                                {canvasT(t, 'common.upload')}
                              </Label>
                              <p className="mt-1 text-xs text-white/55">
                                {canvasT(t, 'studio.uploadAudioHint')}
                              </p>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={isUploadingAudio}
                              className="relative h-9 border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white"
                            >
                              {isUploadingAudio ? (
                                <LoaderCircle className="animate-spin" />
                              ) : (
                                <Upload />
                              )}
                              {isUploadingAudio
                                ? canvasT(t, 'studio.uploading')
                                : canvasT(t, 'common.upload')}
                              <input
                                type="file"
                                accept="audio/mpeg,audio/mp3,audio/wav,audio/x-wav"
                                onChange={handleSelectedAudioUpload}
                                className="absolute inset-0 cursor-pointer opacity-0"
                                disabled={isUploadingAudio}
                              />
                            </Button>
                          </div>

                          {selectedNodeData.audio?.url ? (
                            <audio
                              src={selectedNodeData.audio.url}
                              controls
                              className="mt-2 w-full"
                            />
                          ) : (
                            <div className="mt-2 rounded-2xl border border-dashed border-white/10 px-3 py-3 text-center text-xs text-white/45">
                              {canvasT(t, 'studio.noAudioFile')}
                            </div>
                          )}
                        </div>
                      </TabsContent>
                    </Tabs>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <Tabs
                      value={selectedMediaMode || 'generate'}
                      onValueChange={handleSelectedMediaModeChange}
                    >
                      <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
                        <TabsList className="border-white/10 bg-black/35 text-white/55">
                          <TabsTrigger
                            value="generate"
                            className="data-[state=active]:bg-white data-[state=active]:text-black"
                          >
                            {canvasT(t, 'studio.modeGenerate')}
                          </TabsTrigger>
                          <TabsTrigger
                            value="upload"
                            className="data-[state=active]:bg-white data-[state=active]:text-black"
                          >
                            {canvasT(t, 'studio.modeUpload')}
                          </TabsTrigger>
                        </TabsList>
                        {selectedMediaMode === 'generate' ? (
                          <div className="min-w-0 flex-1">
                            <CanvasReferencesRail
                              references={selectedReferences}
                              onPreviewImage={setImagePreview}
                              onInsertToken={handleInsertReferenceToken}
                              onRemove={handleRemoveReference}
                              disableImageTokens={
                                shouldDisableMjImageReferenceTokens
                              }
                            />
                          </div>
                        ) : null}
                      </div>

                      <TabsContent value="generate" className="mt-3">
                        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_260px]">
                          <div className="space-y-3">
                            <Textarea
                              value={selectedNodeData.prompt}
                              onChange={(event) =>
                                handleSelectedNodeChange({
                                  prompt: event.target.value,
                                })
                              }
                              onPointerDown={(event) => event.stopPropagation()}
                              className="min-h-[88px] rounded-[20px] border-white/10 bg-black/45 px-4 py-3 text-sm text-white placeholder:text-white/30"
                              placeholder={selectedNodePromptPlaceholder}
                            />
                            <div className="grid grid-cols-[minmax(0,1fr)_minmax(220px,300px)] gap-3">
                              <div className="min-w-0 space-y-2">
                                <Select
                                  value={selectedNodeData.model}
                                  onValueChange={(value) =>
                                    selectedNodeData.nodeType === 'image'
                                      ? handleSelectedImageModelChange(value)
                                      : handleSelectedNodeChange({
                                          model: value,
                                        })
                                  }
                                >
                                  <SelectTrigger className="h-12 border-white/10 bg-white/[0.04] text-white">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent
                                    className={CANVAS_SELECT_CONTENT_CLASS}
                                  >
                                    {selectedNodeModelOptions.map((model) => (
                                      <SelectItem
                                        key={model}
                                        value={model}
                                        textValue={getPublicModelLabel(model)}
                                        className="py-0.5"
                                      >
                                        <ModelSelectOption
                                          model={model}
                                          label={getPublicModelLabel(model)}
                                        />
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>

                              <DropdownMenu
                                modal={false}
                                open={isMediaSettingsOpen}
                                onOpenChange={setIsMediaSettingsOpen}
                              >
                                <DropdownMenuTrigger asChild>
                                  <button
                                    type="button"
                                    className="flex h-10 w-full items-center justify-between gap-3 rounded-full border border-white/10 bg-white/[0.04] px-4 text-left transition hover:bg-white/[0.08]"
                                  >
                                    <span className="inline-flex shrink-0 items-center gap-2 text-sm text-white">
                                      <SlidersHorizontal className="size-4 text-white/65" />
                                      {canvasT(t, 'common.settings')}
                                    </span>
                                    <span className="inline-flex min-w-0 items-center gap-2 text-xs text-white/50">
                                      <span className="truncate">
                                        {getCanvasMediaSettingsSummary(
                                          selectedNodeData
                                        )}
                                      </span>
                                      <ChevronDown
                                        className={cn(
                                          'size-4 transition-transform',
                                          isMediaSettingsOpen && 'rotate-180'
                                        )}
                                      />
                                    </span>
                                  </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent
                                  side="top"
                                  align="end"
                                  sideOffset={12}
                                  className={cn(
                                    'rounded-[22px] border-white/10 bg-[#111111]/98 p-3 text-white shadow-[0_28px_80px_rgba(0,0,0,0.52)]',
                                    selectedNodeData.nodeType === 'image' &&
                                      isMidjourneyCanvasImageModel(
                                        selectedNodeData.model
                                      )
                                      ? 'w-[min(96vw,900px)]'
                                      : 'w-[min(92vw,620px)]'
                                  )}
                                >
                                  {selectedNodeData.nodeType === 'image' &&
                                  isMidjourneyCanvasImageModel(
                                    selectedNodeData.model
                                  ) ? (
                                    <div className="grid gap-3">
                                      <CanvasMjReferenceAssignments
                                        references={selectedReferences.filter(
                                          (reference) =>
                                            reference.sourceNodeType === 'image'
                                        )}
                                        onAssignReference={
                                          handleAssignMjReference
                                        }
                                        imageWeight={
                                          selectedNodeData.imageWeight
                                        }
                                        styleReferenceWeight={
                                          selectedNodeData.styleReferenceWeight
                                        }
                                        omniReferenceWeight={
                                          selectedNodeData.omniReferenceWeight
                                        }
                                        onImageWeightChange={(value) =>
                                          handleSelectedNodeChange({
                                            imageWeight: value,
                                          } as Partial<CanvasNodeData>)
                                        }
                                        onStyleReferenceWeightChange={(value) =>
                                          handleSelectedNodeChange({
                                            styleReferenceWeight: value,
                                          } as Partial<CanvasNodeData>)
                                        }
                                        onOmniReferenceWeightChange={(value) =>
                                          handleSelectedNodeChange({
                                            omniReferenceWeight: value,
                                          } as Partial<CanvasNodeData>)
                                        }
                                      />

                                      <div className="space-y-2">
                                        <Label className="text-xs tracking-[0.2em] text-white/45 uppercase">
                                          {canvasT(t, 'studio.aspectRatio')}
                                        </Label>
                                        <Select
                                          value={selectedNodeData.aspectRatio}
                                          onValueChange={(value) =>
                                            handleSelectedNodeChange({
                                              aspectRatio: value,
                                            } as Partial<CanvasNodeData>)
                                          }
                                        >
                                          <SelectTrigger className="border-white/10 bg-white/[0.04] text-white">
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent
                                            className={
                                              CANVAS_SELECT_CONTENT_CLASS
                                            }
                                          >
                                            {getCanvasImageAspectRatioOptions(
                                              selectedNodeData
                                            ).map((item: string) => (
                                              <SelectItem
                                                key={item}
                                                value={item}
                                              >
                                                {item}
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      </div>
                                    </div>
                                  ) : (
                                    <div
                                      className={cn(
                                        'grid gap-2',
                                        selectedNodeData.nodeType === 'video'
                                          ? shouldShowSeedanceReferenceMode
                                            ? 'sm:grid-cols-4'
                                            : 'sm:grid-cols-3'
                                          : 'sm:grid-cols-2'
                                      )}
                                    >
                                      {selectedNodeData.nodeType !== 'video' ||
                                      selectedVideoAspectRatioOptions.length >
                                        0 ? (
                                        <div className="space-y-2">
                                          <Label className="text-xs tracking-[0.2em] text-white/45 uppercase">
                                            {canvasT(t, 'studio.aspectRatio')}
                                          </Label>
                                          <Select
                                            value={selectedNodeData.aspectRatio}
                                            onValueChange={(value) =>
                                              handleSelectedNodeChange({
                                                aspectRatio: value,
                                              } as Partial<CanvasNodeData>)
                                            }
                                          >
                                            <SelectTrigger className="border-white/10 bg-white/[0.04] text-white">
                                              <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent
                                              className={
                                                CANVAS_SELECT_CONTENT_CLASS
                                              }
                                            >
                                              {(selectedNodeData.nodeType ===
                                              'image'
                                                ? getCanvasImageAspectRatioOptions(
                                                    selectedNodeData
                                                  )
                                                : selectedVideoAspectRatioOptions
                                              ).map((item) => (
                                                <SelectItem
                                                  key={item}
                                                  value={item}
                                                >
                                                  {item}
                                                </SelectItem>
                                              ))}
                                            </SelectContent>
                                          </Select>
                                        </div>
                                      ) : null}

                                      {(selectedNodeData.nodeType === 'image' &&
                                        shouldShowCanvasImageResolutionControl(
                                          selectedNodeData
                                        )) ||
                                      (selectedNodeData.nodeType === 'video' &&
                                        selectedVideoResolutionOptions.length >
                                          0) ? (
                                        <div className="space-y-2">
                                          <Label className="text-xs tracking-[0.2em] text-white/45 uppercase">
                                            {canvasT(t, 'studio.resolution')}
                                          </Label>
                                          <Select
                                            value={selectedNodeData.resolution}
                                            onValueChange={(value) =>
                                              handleSelectedNodeChange({
                                                resolution: value,
                                              } as Partial<CanvasNodeData>)
                                            }
                                          >
                                            <SelectTrigger className="border-white/10 bg-white/[0.04] text-white">
                                              <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent
                                              className={
                                                CANVAS_SELECT_CONTENT_CLASS
                                              }
                                            >
                                              {(selectedNodeData.nodeType ===
                                              'image'
                                                ? IMAGE_RESOLUTION_OPTIONS
                                                : selectedVideoResolutionOptions
                                              ).map((item: string) => (
                                                <SelectItem
                                                  key={item}
                                                  value={item}
                                                >
                                                  {item}
                                                </SelectItem>
                                              ))}
                                            </SelectContent>
                                          </Select>
                                        </div>
                                      ) : null}

                                      {selectedNodeData.nodeType === 'video' &&
                                      selectedVideoDurationOptions.length >
                                        0 ? (
                                        <div className="space-y-2">
                                          <Label className="text-xs tracking-[0.2em] text-white/45 uppercase">
                                            {canvasT(t, 'studio.duration')}
                                          </Label>
                                          <Select
                                            value={selectedNodeData.duration}
                                            onValueChange={(value) =>
                                              handleSelectedNodeChange({
                                                duration: value,
                                              } as Partial<CanvasNodeData>)
                                            }
                                          >
                                            <SelectTrigger className="border-white/10 bg-white/[0.04] text-white">
                                              <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent
                                              className={
                                                CANVAS_SELECT_CONTENT_CLASS
                                              }
                                            >
                                              {selectedVideoDurationOptions.map(
                                                (item: string) => (
                                                  <SelectItem
                                                    key={item}
                                                    value={item}
                                                  >
                                                    {item}s
                                                  </SelectItem>
                                                )
                                              )}
                                            </SelectContent>
                                          </Select>
                                        </div>
                                      ) : null}

                                      {selectedNodeData.nodeType === 'video' &&
                                      shouldShowSeedanceReferenceMode ? (
                                        <div className="space-y-2">
                                          <Label className="text-xs tracking-[0.2em] text-white/45 uppercase">
                                            {canvasT(t, 'studio.referenceMode')}
                                          </Label>
                                          <Select
                                            value={
                                              selectedNodeData.referenceMode
                                            }
                                            onValueChange={(value) =>
                                              handleSelectedNodeChange({
                                                referenceMode: value,
                                              } as Partial<CanvasNodeData>)
                                            }
                                          >
                                            <SelectTrigger className="border-white/10 bg-white/[0.04] text-white">
                                              <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent
                                              className={
                                                CANVAS_SELECT_CONTENT_CLASS
                                              }
                                            >
                                              {VIDEO_REFERENCE_MODE_OPTIONS.map(
                                                (item) => (
                                                  <SelectItem
                                                    key={item}
                                                    value={item}
                                                  >
                                                    {item === 'auto'
                                                      ? canvasT(
                                                          t,
                                                          'studio.referenceModeAuto'
                                                        )
                                                      : item === 'first_frame'
                                                        ? canvasT(
                                                            t,
                                                            'studio.referenceModeFirstFrame'
                                                          )
                                                        : item ===
                                                            'first_last_frames'
                                                          ? canvasT(
                                                              t,
                                                              'studio.referenceModeFirstLast'
                                                            )
                                                          : canvasT(
                                                              t,
                                                              'studio.referenceModeOmni'
                                                            )}
                                                  </SelectItem>
                                                )
                                              )}
                                            </SelectContent>
                                          </Select>
                                        </div>
                                      ) : null}
                                    </div>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>

                          <div className="space-y-3 rounded-[22px] border border-white/10 bg-black/40 p-3">
                            <Button
                              className={cn(
                                'h-10 w-full rounded-full bg-white text-black hover:bg-white/90',
                                shouldShowSelectedCredits && 'justify-between'
                              )}
                              onClick={() => void handleExecuteSelectedNode()}
                              disabled={
                                conflictDetected ||
                                executingNodeId === selectedNode.id ||
                                selectedNodeData.status === 'queued' ||
                                selectedNodeData.status === 'running'
                              }
                            >
                              <span className="inline-flex min-w-0 items-center gap-2">
                                {executingNodeId === selectedNode.id ? (
                                  <LoaderCircle className="animate-spin" />
                                ) : (
                                  <Sparkles />
                                )}
                                {executingNodeId === selectedNode.id
                                  ? canvasT(t, 'studio.generating')
                                  : canvasT(t, 'studio.startGenerating')}
                              </span>
                              {!(executingNodeId === selectedNode.id) &&
                              shouldShowSelectedCredits ? (
                                <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-medium text-black/70">
                                  <Coins className="size-3.5" />
                                  {selectedGenerateCreditLabel}
                                </span>
                              ) : null}
                            </Button>

                            {(selectedNodeData.status === 'running' ||
                              selectedNodeData.status === 'queued') && (
                              <Progress
                                value={getNodeStatusProgress(
                                  selectedNodeData.status
                                )}
                                className="h-1.5 bg-white/8 [&>[data-slot=progress-indicator]]:bg-sky-400"
                              />
                            )}
                          </div>
                        </div>
                      </TabsContent>

                      <TabsContent value="upload" className="mt-3">
                        <div className="rounded-[20px] border border-white/10 bg-black/35 p-2.5">
                          <CanvasMediaControl
                            nodeData={selectedNodeData}
                            onPreviewImage={setImagePreview}
                            onChange={(patch) =>
                              handleSelectedNodeChange(
                                patch as Partial<CanvasNodeData>
                              )
                            }
                          />
                        </div>
                      </TabsContent>
                    </Tabs>
                  </div>
                )}

                {executionError ? (
                  <div className="mt-3 flex items-start gap-2 rounded-2xl border border-amber-400/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
                    <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                    <p>{executionError}</p>
                  </div>
                ) : null}

                {selectedNodeData.errorMessage ? (
                  <div className="mt-3 flex items-start gap-2 rounded-2xl border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-xs text-rose-100">
                    <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                    <p>
                      {translateCanvasRuntimeMessage(
                        t,
                        selectedNodeData.errorMessage
                      )}
                    </p>
                  </div>
                ) : null}
              </div>
            </Panel>
          ) : null}
        </ReactFlow>

        {isFileDragging ? (
          <div className="pointer-events-none absolute inset-6 z-20 flex items-center justify-center rounded-[28px] border border-dashed border-white/20 bg-black/55 backdrop-blur-sm">
            <div className="rounded-full border border-white/12 bg-white/[0.04] px-5 py-3 text-sm font-medium text-white/88">
              {canvasT(t, 'studio.dragFilesHere')}
            </div>
          </div>
        ) : null}

        {nodes.length === 0 ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-6">
            <div className="pointer-events-auto w-full max-w-[620px] rounded-[32px] border border-white/10 bg-[#101010]/84 p-6 text-center shadow-[0_28px_80px_rgba(0,0,0,0.38)] backdrop-blur-xl">
              <div className="mx-auto flex size-14 items-center justify-center rounded-[20px] border border-white/10 bg-white/[0.04]">
                <Sparkles className="size-6 text-white/80" />
              </div>
              <h2 className="mt-5 text-2xl font-semibold text-white">
                {canvasT(t, 'studio.emptyStateTitle')}
              </h2>
              <p className="mx-auto mt-3 max-w-[440px] text-sm leading-6 text-white/60">
                {canvasT(t, 'studio.emptyStateDescription')}
              </p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <Button
                  onClick={() => handleAddNode('text')}
                  className="rounded-full bg-white text-black hover:bg-white/90"
                >
                  <Type />
                  {canvasT(t, 'studio.addText')}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleAddNode('note')}
                  className="rounded-full border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white"
                >
                  <StickyNote />
                  {canvasT(t, 'studio.addNote')}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleAddNode('image')}
                  className="rounded-full border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white"
                >
                  <ImageIcon />
                  {canvasT(t, 'studio.addImage')}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleAddNode('video')}
                  className="rounded-full border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white"
                >
                  <Video />
                  {canvasT(t, 'studio.addVideo')}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleAddNode('audio')}
                  className="rounded-full border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white"
                >
                  <AudioLines />
                  {canvasT(t, 'studio.addAudio')}
                </Button>
              </div>
            </div>
          </div>
        ) : null}

        {quickAddMenu ? (
          <CanvasQuickAddMenu
            menu={quickAddMenu}
            selectedCount={selectedCount}
            onFitView={() => {
              setQuickAddMenu(null);
              void reactFlow.fitView({
                duration: 180,
                padding: 0.18,
              });
            }}
            onDeleteSelection={() => {
              deleteSelection();
              setQuickAddMenu(null);
            }}
            onCopyNode={handleCopyNode}
            onDeleteNode={handleDeleteNode}
            onDeleteEdge={handleDeleteEdge}
            onSelect={handleQuickAddSelect}
          />
        ) : null}

        <Dialog
          open={isTemplateDialogOpen}
          onOpenChange={setIsTemplateDialogOpen}
        >
          <DialogContent className="max-w-lg border-white/10 bg-[#111111] text-white">
            <DialogTitle>{canvasT(t, 'studio.templateLinkReady')}</DialogTitle>
            <div className="space-y-4">
              <p className="text-sm leading-6 text-white/70">
                {canvasT(t, 'studio.templateLinkDescription')}
              </p>
              <Input
                readOnly
                value={publishedTemplateUrl}
                className="border-white/10 bg-white/[0.04] text-white"
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  onClick={() => void handleCopyTemplateLink()}
                  className="rounded-full bg-white text-black hover:bg-white/90"
                >
                  <Copy className="size-4" />
                  {canvasT(t, 'studio.copyTemplateLink')}
                </Button>
                <Button
                  asChild
                  type="button"
                  variant="outline"
                  className="rounded-full border-white/10 bg-white/[0.03] text-white hover:bg-white/10 hover:text-white"
                >
                  <a
                    href={publishedTemplateUrl || undefined}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <ExternalLink className="size-4" />
                    {canvasT(t, 'studio.openTemplatePage')}
                  </a>
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog
          open={Boolean(imagePreview)}
          onOpenChange={(open) => {
            if (!open) {
              setImagePreview(null);
            }
          }}
        >
          <DialogContent
            showCloseButton={false}
            fullScreen
            className="bg-black p-0 text-white"
          >
            <DialogTitle className="sr-only">
              {imagePreview?.title || canvasT(t, 'studio.imagePreview')}
            </DialogTitle>
            {imagePreview ? (
              <div className="relative flex h-full min-h-0 flex-col">
                <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-between gap-3 bg-gradient-to-b from-black/90 via-black/55 to-transparent px-4 py-4 sm:px-6 sm:py-5">
                  <p className="min-w-0 truncate pr-4 text-sm font-medium text-white/82">
                    {imagePreview.title}
                  </p>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setImagePreview(null)}
                    className="rounded-full text-white/70 hover:bg-white/10 hover:text-white"
                  >
                    <X className="size-4" />
                  </Button>
                </div>
                <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-black">
                  {activePreviewImage ? (
                    <img
                      src={activePreviewImage.url}
                      alt={imagePreview.title}
                      className="max-h-full max-w-full object-contain"
                    />
                  ) : null}
                </div>
                <div className="absolute inset-x-0 bottom-0 z-20 flex flex-col gap-3 bg-gradient-to-t from-black/92 via-black/60 to-transparent px-4 pt-12 pb-4 sm:px-6 sm:pb-6">
                  {imagePreview.images.length > 1 ? (
                    <div className="flex justify-center overflow-x-auto">
                      <div className="flex gap-2">
                        {imagePreview.images.map((image, index) => (
                          <button
                            key={`${image.url}-${index}`}
                            type="button"
                            onClick={() => handlePreviewImageSelect(index)}
                            className={cn(
                              'overflow-hidden rounded-[16px] border bg-black/70 shadow-[0_12px_30px_rgba(0,0,0,0.3)]',
                              index === imagePreview.activeIndex
                                ? 'border-white/55'
                                : 'border-white/10'
                            )}
                          >
                            <img
                              src={image.thumbnailUrl || image.url}
                              alt={`${imagePreview.title} ${index + 1}`}
                              className="h-16 w-16 object-cover sm:h-20 sm:w-20"
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  <div className="flex flex-wrap justify-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => void handleCopyPreviewImage()}
                      disabled={!activePreviewImage || isCopyingPreviewImage}
                      className="rounded-full border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white"
                    >
                      {isCopyingPreviewImage ? (
                        <LoaderCircle className="size-4 animate-spin" />
                      ) : (
                        <Copy className="size-4" />
                      )}
                      {canvasT(t, 'common.copy')}
                    </Button>
                    <Button
                      asChild
                      variant="outline"
                      className="rounded-full border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white"
                    >
                      <a
                        href={activePreviewImageProxyUrl || undefined}
                        download
                      >
                        <Download className="size-4" />
                        {canvasT(t, 'common.download')}
                      </a>
                    </Button>
                  </div>
                </div>
              </div>
            ) : null}
          </DialogContent>
        </Dialog>

        <CanvasImageEditorDialog
          open={Boolean(imageEditor)}
          state={imageEditor}
          onOpenChange={(open) => {
            if (!open) {
              setImageEditor(null);
            }
          }}
          onSave={handleSaveEditedImage}
        />
      </div>
    </div>
  );
}

export function CanvasStudioShell({
  initialCanvas,
}: {
  initialCanvas: CanvasDocumentRecord;
}) {
  return (
    <>
      <style jsx global>{`
        .canvas-studio,
        .canvas-studio * {
          color-scheme: dark;
        }

        .canvas-studio .react-flow__pane {
          cursor: pointer;
        }

        .canvas-studio .react-flow__selectionpane {
          cursor: pointer;
        }

        .canvas-studio.is-panning .react-flow__pane {
          cursor: pointer;
        }

        .canvas-studio .react-flow__node {
          cursor: grab;
        }

        .canvas-studio .react-flow__node.dragging {
          cursor: grabbing;
        }

        .canvas-studio .react-flow__handle {
          cursor: crosshair;
        }

        .canvas-studio .react-flow__node .nodrag,
        .canvas-studio .react-flow__node button {
          cursor: inherit;
        }

        .canvas-studio .react-flow__node button.cursor-text {
          cursor: text;
        }

        .canvas-studio .react-flow__node input,
        .canvas-studio .react-flow__node textarea {
          cursor: text;
        }

        .canvas-studio .react-flow__node .cursor-grab {
          cursor: grab;
        }

        .canvas-studio .canvas-node-handle {
          width: 16px !important;
          height: 16px !important;
          opacity: 1 !important;
          border-width: 2px !important;
          border-color: rgba(255, 255, 255, 0.58) !important;
          background: #0d0d0d !important;
          box-shadow: 0 0 0 4px rgba(0, 0, 0, 0.26);
          transition:
            transform 150ms ease,
            border-color 150ms ease,
            background-color 150ms ease,
            box-shadow 150ms ease;
        }

        .canvas-studio .react-flow__node:hover .canvas-node-handle,
        .canvas-studio .react-flow__node.selected .canvas-node-handle,
        .canvas-studio .canvas-node-handle:hover {
          border-color: rgba(255, 255, 255, 0.96) !important;
          background: #ffffff !important;
          box-shadow:
            0 0 0 4px rgba(0, 0, 0, 0.32),
            0 0 20px rgba(255, 255, 255, 0.16);
        }

        .canvas-studio .react-flow__handle-left.canvas-node-handle:hover,
        .canvas-studio
          .react-flow__node:hover
          .react-flow__handle-left.canvas-node-handle,
        .canvas-studio
          .react-flow__node.selected
          .react-flow__handle-left.canvas-node-handle {
          transform: translate(-50%, -50%) scale(1.12);
        }

        .canvas-studio .react-flow__handle-right.canvas-node-handle:hover,
        .canvas-studio
          .react-flow__node:hover
          .react-flow__handle-right.canvas-node-handle,
        .canvas-studio
          .react-flow__node.selected
          .react-flow__handle-right.canvas-node-handle {
          transform: translate(50%, -50%) scale(1.12);
        }

        .canvas-studio .react-flow__edge-interaction {
          cursor: pointer;
        }
      `}</style>
      <ReactFlowProvider>
        <CanvasStudioInner initialCanvas={initialCanvas} />
      </ReactFlowProvider>
    </>
  );
}
