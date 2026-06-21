import { AIMediaType } from '@/extensions/ai/types';
import {
  AICreditScene,
  normalizeAICreditScene,
} from '@/shared/lib/ai-credit-rules';

export type PublicMediaType =
  | AIMediaType.IMAGE
  | AIMediaType.VIDEO
  | AIMediaType.AUDIO
  | AIMediaType.MUSIC;

export interface PublicModelInfo {
  model: string;
  media_type: PublicMediaType;
  supported_scenes: AICreditScene[];
}

interface InternalModelRoute {
  provider: string;
  model: string;
}

interface PublicModelDefinition {
  mediaType: PublicMediaType;
  scenes: Partial<Record<AICreditScene, InternalModelRoute>>;
}

const PUBLIC_MODEL_LABELS: Record<string, string> = {
  'suno-sound-v5': 'Suno Sound V5',
  'suno-sound-v5-5': 'Suno Sound V5.5',
  'suno-music-v3-5': 'Suno Music V3.5',
  'suno-music-v4': 'Suno Music V4',
  'suno-music-v4-5': 'Suno Music V4.5',
  'suno-music-v4-5-plus': 'Suno Music V4.5+',
  'suno-music-v5': 'Suno Music V5',
  'suno-music-v5-5': 'Suno Music V5.5',
  'happyhorse-1.0': 'HappyHorse 1.0',
  'happyhorse-1.0-first-frame': 'HappyHorse 1.0 First Frame',
  'happyhorse-1.0-reference': 'HappyHorse 1.0 Reference',
  'happyhorse-1.0-video-edit': 'HappyHorse 1.0 Video Edit',
  'hailuo-2.3-standard': 'Hailuo 2.3 Standard',
  'hailuo-2.3-pro': 'Hailuo 2.3 Pro',
  'nano-banana-2': 'Nano Banana 2',
  'nano-banana-pro': 'Nano Banana Pro',
  'gpt-image-2': 'GPT Image 2',
  'midjourney-v7': 'Midjourney V7',
  'sora-2': 'Sora 2',
  'sora-2-pro': 'Sora 2 Pro',
  'seedance-1-pro': 'Seedance 1 Pro',
  'seedance-1-lite': 'Seedance 1 Lite',
  'seedance-1-pro-fast': 'Seedance 1 Pro Fast',
  'seedance-2-stable': 'Seedance 2 Stable',
  'seedance-2-fast-stable': 'Seedance 2 Fast Stable',
  'seedance-2': 'Seedance 2 Legacy',
  'seedance-2-fast': 'Seedance 2 Fast Legacy',
  'seedance-2-ark': 'Seedance 2',
  'seedance-2-fast-ark': 'Seedance 2 Fast',
  'seedance-2-mini-ark': 'Seedance 2 Mini',
  'seedance-2-preview': 'Seedance 2 Preview',
  'seedance-2-fast-preview': 'Seedance 2 Fast Preview',
  'seedance-2-watermark-remover': 'Seedance 2 Watermark Remover',
  'kling-2.6': 'Kling 2.6',
  'kling-3.0': 'Kling 3.0',
  'kling-3.0-motion-control': 'Kling 3.0 Motion Control',
  'veo-3.1-fast': 'Veo 3.1 Fast',
  'veo-3.1-quality': 'Veo 3.1 Quality',
  'gemini-omni-video': 'Gemini Omni Video',
  'kling-video-o1': 'Kling Video O1',
};

interface ResolvePublicModelRouteInput {
  publicModel: string;
  mediaType: PublicMediaType;
  scene?: string | null;
  options?: unknown;
}

type ResolvePublicModelRouteResult =
  | {
      ok: true;
      publicModel: string;
      mediaType: PublicMediaType;
      scene: AICreditScene;
      provider: string;
      model: string;
      supportedScenes: AICreditScene[];
      options: Record<string, unknown>;
    }
  | {
      ok: false;
      code: string;
      message: string;
      supportedScenes?: AICreditScene[];
    };

const PUBLIC_MODEL_REGISTRY: Record<string, PublicModelDefinition> = {
  'suno-sound-v5': {
    mediaType: AIMediaType.AUDIO,
    scenes: {
      'text-to-audio': { provider: 'kie', model: 'V5' },
    },
  },
  'suno-sound-v5-5': {
    mediaType: AIMediaType.AUDIO,
    scenes: {
      'text-to-audio': { provider: 'kie', model: 'V5_5' },
    },
  },
  'suno-music-v3-5': {
    mediaType: AIMediaType.MUSIC,
    scenes: {
      'text-to-music': { provider: 'kie', model: 'V3_5' },
    },
  },
  'suno-music-v4': {
    mediaType: AIMediaType.MUSIC,
    scenes: {
      'text-to-music': { provider: 'kie', model: 'V4' },
    },
  },
  'suno-music-v4-5': {
    mediaType: AIMediaType.MUSIC,
    scenes: {
      'text-to-music': { provider: 'kie', model: 'V4_5' },
    },
  },
  'suno-music-v4-5-plus': {
    mediaType: AIMediaType.MUSIC,
    scenes: {
      'text-to-music': { provider: 'kie', model: 'V4_5PLUS' },
    },
  },
  'suno-music-v5': {
    mediaType: AIMediaType.MUSIC,
    scenes: {
      'text-to-music': { provider: 'kie', model: 'V5' },
    },
  },
  'suno-music-v5-5': {
    mediaType: AIMediaType.MUSIC,
    scenes: {
      'text-to-music': { provider: 'kie', model: 'V5_5' },
    },
  },
  'nano-banana-2': {
    mediaType: AIMediaType.IMAGE,
    scenes: {
      'text-to-image': { provider: 'kie', model: 'nano-banana-2' },
      'image-to-image': { provider: 'kie', model: 'nano-banana-2' },
    },
  },
  'nano-banana-pro': {
    mediaType: AIMediaType.IMAGE,
    scenes: {
      'text-to-image': { provider: 'kie', model: 'nano-banana-pro' },
      'image-to-image': { provider: 'kie', model: 'nano-banana-pro' },
    },
  },
  'gpt-image-2': {
    mediaType: AIMediaType.IMAGE,
    scenes: {
      'text-to-image': {
        provider: 'kie',
        model: 'gpt-image-2-text-to-image',
      },
      'image-to-image': {
        provider: 'kie',
        model: 'gpt-image-2-image-to-image',
      },
    },
  },
  'midjourney-v7': {
    mediaType: AIMediaType.IMAGE,
    scenes: {
      'text-to-image': { provider: 'legnext', model: 'midjourney-v7' },
      'image-to-image': { provider: 'legnext', model: 'midjourney-v7' },
    },
  },
  'sora-2': {
    mediaType: AIMediaType.VIDEO,
    scenes: {
      'text-to-video': { provider: 'kie', model: 'sora-2-text-to-video' },
      'image-to-video': { provider: 'kie', model: 'sora-2-image-to-video' },
    },
  },
  'sora-2-pro': {
    mediaType: AIMediaType.VIDEO,
    scenes: {
      'text-to-video': { provider: 'kie', model: 'sora-2-pro-text-to-video' },
      'image-to-video': { provider: 'kie', model: 'sora-2-pro-image-to-video' },
    },
  },
  'seedance-1-pro': {
    mediaType: AIMediaType.VIDEO,
    scenes: {
      'text-to-video': {
        provider: 'kie',
        model: 'bytedance/v1-pro-text-to-video',
      },
      'image-to-video': {
        provider: 'kie',
        model: 'bytedance/v1-pro-image-to-video',
      },
    },
  },
  'seedance-1-lite': {
    mediaType: AIMediaType.VIDEO,
    scenes: {
      'text-to-video': {
        provider: 'kie',
        model: 'bytedance/v1-lite-text-to-video',
      },
      'image-to-video': {
        provider: 'kie',
        model: 'bytedance/v1-lite-image-to-video',
      },
    },
  },
  'seedance-1-pro-fast': {
    mediaType: AIMediaType.VIDEO,
    scenes: {
      'image-to-video': {
        provider: 'kie',
        model: 'bytedance/v1-pro-fast-image-to-video',
      },
    },
  },
  'happyhorse-1.0': {
    mediaType: AIMediaType.VIDEO,
    scenes: {
      'text-to-video': {
        provider: 'dashscope',
        model: 'happyhorse-1.0-t2v',
      },
    },
  },
  'happyhorse-1.0-first-frame': {
    mediaType: AIMediaType.VIDEO,
    scenes: {
      'image-to-video': {
        provider: 'dashscope',
        model: 'happyhorse-1.0-i2v',
      },
    },
  },
  'happyhorse-1.0-reference': {
    mediaType: AIMediaType.VIDEO,
    scenes: {
      'image-to-video': {
        provider: 'dashscope',
        model: 'happyhorse-1.0-r2v',
      },
    },
  },
  'happyhorse-1.0-video-edit': {
    mediaType: AIMediaType.VIDEO,
    scenes: {
      'video-to-video': {
        provider: 'dashscope',
        model: 'happyhorse-1.0-video-edit',
      },
    },
  },
  'hailuo-2.3-standard': {
    mediaType: AIMediaType.VIDEO,
    scenes: {
      'image-to-video': {
        provider: 'kie',
        model: 'hailuo/2-3-image-to-video-standard',
      },
    },
  },
  'hailuo-2.3-pro': {
    mediaType: AIMediaType.VIDEO,
    scenes: {
      'image-to-video': {
        provider: 'kie',
        model: 'hailuo/2-3-image-to-video-pro',
      },
    },
  },
  'seedance-2-stable': {
    mediaType: AIMediaType.VIDEO,
    scenes: {
      'text-to-video': { provider: 'kie', model: 'seedance-2-stable' },
      'image-to-video': { provider: 'kie', model: 'seedance-2-stable' },
      'video-to-video': { provider: 'kie', model: 'seedance-2-stable' },
    },
  },
  'seedance-2-fast-stable': {
    mediaType: AIMediaType.VIDEO,
    scenes: {
      'text-to-video': {
        provider: 'kie',
        model: 'seedance-2-fast-stable',
      },
      'image-to-video': {
        provider: 'kie',
        model: 'seedance-2-fast-stable',
      },
      'video-to-video': {
        provider: 'kie',
        model: 'seedance-2-fast-stable',
      },
    },
  },
  'seedance-2': {
    mediaType: AIMediaType.VIDEO,
    scenes: {
      'text-to-video': { provider: 'piapi', model: 'seedance-2' },
      'image-to-video': { provider: 'piapi', model: 'seedance-2' },
      'video-to-video': { provider: 'piapi', model: 'seedance-2' },
    },
  },
  'seedance-2-fast': {
    mediaType: AIMediaType.VIDEO,
    scenes: {
      'text-to-video': { provider: 'piapi', model: 'seedance-2-fast' },
      'image-to-video': { provider: 'piapi', model: 'seedance-2-fast' },
      'video-to-video': { provider: 'piapi', model: 'seedance-2-fast' },
    },
  },
  'seedance-2-ark': {
    mediaType: AIMediaType.VIDEO,
    scenes: {
      'text-to-video': { provider: 'ark', model: 'seedance-2-ark' },
      'image-to-video': { provider: 'ark', model: 'seedance-2-ark' },
      'video-to-video': { provider: 'ark', model: 'seedance-2-ark' },
    },
  },
  'seedance-2-fast-ark': {
    mediaType: AIMediaType.VIDEO,
    scenes: {
      'text-to-video': { provider: 'ark', model: 'seedance-2-fast-ark' },
      'image-to-video': { provider: 'ark', model: 'seedance-2-fast-ark' },
      'video-to-video': { provider: 'ark', model: 'seedance-2-fast-ark' },
    },
  },
  'seedance-2-mini-ark': {
    mediaType: AIMediaType.VIDEO,
    scenes: {
      'text-to-video': { provider: 'ark', model: 'seedance-2-mini-ark' },
      'image-to-video': { provider: 'ark', model: 'seedance-2-mini-ark' },
      'video-to-video': { provider: 'ark', model: 'seedance-2-mini-ark' },
    },
  },
  'seedance-2-preview': {
    mediaType: AIMediaType.VIDEO,
    scenes: {
      'text-to-video': { provider: 'piapi', model: 'seedance-2-preview' },
      'image-to-video': { provider: 'piapi', model: 'seedance-2-preview' },
      'video-to-video': { provider: 'piapi', model: 'seedance-2-preview' },
    },
  },
  'seedance-2-fast-preview': {
    mediaType: AIMediaType.VIDEO,
    scenes: {
      'text-to-video': { provider: 'piapi', model: 'seedance-2-fast-preview' },
      'image-to-video': { provider: 'piapi', model: 'seedance-2-fast-preview' },
      'video-to-video': { provider: 'piapi', model: 'seedance-2-fast-preview' },
    },
  },
  'seedance-2-watermark-remover': {
    mediaType: AIMediaType.VIDEO,
    scenes: {
      'video-to-video': { provider: 'piapi', model: 'remove-watermark' },
    },
  },
  'kling-2.6': {
    mediaType: AIMediaType.VIDEO,
    scenes: {
      'text-to-video': { provider: 'kie', model: 'kling-2.6/text-to-video' },
      'image-to-video': { provider: 'kie', model: 'kling-2.6/image-to-video' },
    },
  },
  'kling-3.0': {
    mediaType: AIMediaType.VIDEO,
    scenes: {
      'text-to-video': { provider: 'kie', model: 'kling-3.0/video' },
      'image-to-video': { provider: 'kie', model: 'kling-3.0/video' },
    },
  },
  'kling-3.0-motion-control': {
    mediaType: AIMediaType.VIDEO,
    scenes: {
      'video-to-video': {
        provider: 'kie',
        model: 'kling-3.0/motion-control',
      },
    },
  },
  'veo-3.1-fast': {
    mediaType: AIMediaType.VIDEO,
    scenes: {
      'text-to-video': { provider: 'kie', model: 'veo3_fast' },
      'image-to-video': { provider: 'kie', model: 'veo3_fast' },
    },
  },
  'veo-3.1-quality': {
    mediaType: AIMediaType.VIDEO,
    scenes: {
      'text-to-video': { provider: 'kie', model: 'veo3' },
      'image-to-video': { provider: 'kie', model: 'veo3' },
    },
  },
  'gemini-omni-video': {
    mediaType: AIMediaType.VIDEO,
    scenes: {
      'text-to-video': { provider: 'kie', model: 'gemini-omni-video' },
      'image-to-video': { provider: 'kie', model: 'gemini-omni-video' },
      'video-to-video': { provider: 'kie', model: 'gemini-omni-video' },
    },
  },
  'kling-video-o1': {
    mediaType: AIMediaType.VIDEO,
    scenes: {
      'video-to-video': {
        provider: 'fal',
        model: 'fal-ai/kling-video/o1/video-to-video/edit',
      },
    },
  },
};

const INTERNAL_ROUTE_TO_PUBLIC_MODEL: Map<string, string> = new Map();
for (const [publicModel, definition] of Object.entries(PUBLIC_MODEL_REGISTRY)) {
  for (const route of Object.values(definition.scenes)) {
    if (!route) {
      continue;
    }
    INTERNAL_ROUTE_TO_PUBLIC_MODEL.set(
      `${route.provider}::${route.model}`,
      publicModel
    );
  }
}

function toOptionsObject(options: unknown): Record<string, unknown> {
  if (!options || typeof options !== 'object' || Array.isArray(options)) {
    return {};
  }
  return options as Record<string, unknown>;
}

function normalizePublicModelName(publicModel: string): string {
  return String(publicModel || '')
    .trim()
    .toLowerCase();
}

function formatPublicModelFallbackLabel(publicModel: string): string {
  return String(publicModel || '')
    .trim()
    .split(/[-_/]+/)
    .filter(Boolean)
    .map((part) => {
      const upper = part.toUpperCase();
      if (upper === 'GPT' || upper === 'VEO') {
        return upper;
      }
      if (/^[a-z]*\d+(\.\d+)?$/i.test(part)) {
        const prefix = part.match(/^[a-z]+/i)?.[0] ?? '';
        const suffix = part.slice(prefix.length);
        return `${prefix.charAt(0).toUpperCase()}${prefix.slice(1)}${suffix}`;
      }
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join(' ');
}

function hasNonEmptyStringArrayValue(
  options: Record<string, unknown>,
  key: string
): boolean {
  const value = options[key];
  if (!Array.isArray(value)) {
    return false;
  }
  return value.some(
    (item) => typeof item === 'string' && Boolean(item.trim().length)
  );
}

function hasNonEmptyStringValue(
  options: Record<string, unknown>,
  key: string
): boolean {
  const value = options[key];
  return typeof value === 'string' && Boolean(value.trim().length);
}

function inferSceneByMediaType({
  mediaType,
  options,
}: {
  mediaType: PublicMediaType;
  options: Record<string, unknown>;
}): AICreditScene {
  if (mediaType === AIMediaType.IMAGE) {
    if (hasNonEmptyStringArrayValue(options, 'image_input')) {
      return 'image-to-image';
    }
    return 'text-to-image';
  }

  if (mediaType === AIMediaType.AUDIO) {
    return 'text-to-audio';
  }

  if (mediaType === AIMediaType.MUSIC) {
    return 'text-to-music';
  }

  if (
    hasNonEmptyStringArrayValue(options, 'video_input') ||
    hasNonEmptyStringValue(options, 'video_url')
  ) {
    return 'video-to-video';
  }
  if (hasNonEmptyStringArrayValue(options, 'image_input')) {
    return 'image-to-video';
  }
  return 'text-to-video';
}

export function resolvePublicModelRoute({
  publicModel,
  mediaType,
  scene,
  options,
}: ResolvePublicModelRouteInput): ResolvePublicModelRouteResult {
  const normalizedModel = normalizePublicModelName(publicModel);
  if (!normalizedModel) {
    return {
      ok: false,
      code: 'invalid_model',
      message: 'Model is required.',
    };
  }

  const definition = PUBLIC_MODEL_REGISTRY[normalizedModel];
  if (!definition) {
    return {
      ok: false,
      code: 'unsupported_model',
      message: 'Model is not supported.',
    };
  }

  if (definition.mediaType !== mediaType) {
    return {
      ok: false,
      code: 'invalid_model_for_media_type',
      message: `Model does not support media type "${mediaType}".`,
    };
  }

  const normalizedOptions = toOptionsObject(options);
  const requestedScene = String(scene || '').trim();
  const sceneCandidate =
    requestedScene ||
    inferSceneByMediaType({ mediaType, options: normalizedOptions });
  const normalizedScene = normalizeAICreditScene({
    mediaType,
    scene: sceneCandidate,
  });

  if (!normalizedScene) {
    return {
      ok: false,
      code: 'invalid_scene',
      message: 'Scene is invalid.',
    };
  }

  const route = definition.scenes[normalizedScene];
  const supportedScenes = Object.keys(definition.scenes) as AICreditScene[];
  if (!route) {
    return {
      ok: false,
      code: 'scene_not_supported',
      message: 'Scene is not supported by this model.',
      supportedScenes,
    };
  }

  return {
    ok: true,
    publicModel: normalizedModel,
    mediaType,
    scene: normalizedScene,
    provider: route.provider,
    model: route.model,
    supportedScenes,
    options: normalizedOptions,
  };
}

export function getPublicModelMediaType(
  publicModel: string
): PublicMediaType | null {
  const normalizedModel = normalizePublicModelName(publicModel);
  if (!normalizedModel) {
    return null;
  }

  const definition = PUBLIC_MODEL_REGISTRY[normalizedModel];
  return definition?.mediaType || null;
}

export function listPublicModels({
  mediaType,
}: {
  mediaType?: PublicMediaType;
} = {}): PublicModelInfo[] {
  const result = Object.entries(PUBLIC_MODEL_REGISTRY)
    .filter(
      ([, definition]) => !mediaType || definition.mediaType === mediaType
    )
    .map(([model, definition]) => ({
      model,
      media_type: definition.mediaType,
      supported_scenes: Object.keys(definition.scenes) as AICreditScene[],
    }))
    .sort((a, b) => {
      const labelCompare = getPublicModelLabel(a.model).localeCompare(
        getPublicModelLabel(b.model)
      );
      if (labelCompare !== 0) {
        return labelCompare;
      }

      return a.model.localeCompare(b.model);
    });

  return result;
}

export function getPublicModelLabel(publicModel: string): string {
  const normalizedModel = normalizePublicModelName(publicModel);
  if (!normalizedModel) {
    return '';
  }

  return (
    PUBLIC_MODEL_LABELS[normalizedModel] ||
    formatPublicModelFallbackLabel(normalizedModel)
  );
}

export function findPublicModelByInternalRoute({
  provider,
  model,
}: {
  provider: string;
  model: string;
}): string | null {
  return INTERNAL_ROUTE_TO_PUBLIC_MODEL.get(`${provider}::${model}`) || null;
}
