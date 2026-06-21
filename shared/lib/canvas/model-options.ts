import type { AICreditScene } from '@/shared/lib/ai-credit-rules';

const NANO_BANANA_PRO_IMAGE_ASPECT_RATIO_OPTIONS = [
  'auto',
  '21:9',
  '16:9',
  '3:2',
  '4:3',
  '5:4',
  '1:1',
  '4:5',
  '3:4',
  '2:3',
  '9:16',
] as const;
const NANO_BANANA_2_IMAGE_ASPECT_RATIO_OPTIONS = [
  ...NANO_BANANA_PRO_IMAGE_ASPECT_RATIO_OPTIONS,
  '4:1',
  '1:4',
  '8:1',
  '1:8',
] as const;
const GPT_IMAGE_2_IMAGE_ASPECT_RATIO_OPTIONS = [
  'auto',
  '1:1',
  '9:16',
  '16:9',
  '4:3',
  '3:4',
] as const;
const MIDJOURNEY_IMAGE_ASPECT_RATIO_OPTIONS = [
  '21:9',
  '16:9',
  '3:2',
  '4:3',
  '5:4',
  '1:1',
  '4:5',
  '3:4',
  '2:3',
  '9:16',
] as const;

const EMPTY_OPTIONS: string[] = [];
const GEMINI_OMNI_VIDEO_MODEL = 'gemini-omni-video';
const GEMINI_OMNI_VIDEO_ASPECT_RATIO_OPTIONS = ['16:9', '9:16'] as const;
const GEMINI_OMNI_VIDEO_RESOLUTION_OPTIONS = ['720p', '1080p', '4K'] as const;
const GEMINI_OMNI_VIDEO_DURATION_OPTIONS = ['4', '6', '8', '10'] as const;
const VEO_VIDEO_MODELS = ['veo-3.1-fast', 'veo-3.1-quality'] as const;
const VEO_VIDEO_ASPECT_RATIO_OPTIONS = ['16:9', '9:16', 'Auto'] as const;
const VEO_VIDEO_DURATION_OPTIONS = ['4', '6', '8'] as const;
const SORA_PRO_DURATION_OPTIONS = ['10', '15'] as const;
const SORA_PRO_ASPECT_RATIO_OPTIONS = ['landscape', 'portrait'] as const;
const SORA_PRO_RESOLUTION_OPTIONS = ['standard', 'high'] as const;
const KLING_26_MODEL = 'kling-2.6';
const KLING_26_DURATION_OPTIONS = ['5', '10'] as const;
const KLING_26_ASPECT_RATIO_OPTIONS = ['1:1', '16:9', '9:16'] as const;
const KLING_30_VIDEO_MODEL = 'kling-3.0';
const KLING_30_MOTION_CONTROL_MODEL = 'kling-3.0-motion-control';
const KLING_30_DURATION_OPTIONS = Array.from({ length: 13 }, (_, index) =>
  String(index + 3)
) as string[];
const KLING_30_ASPECT_RATIO_OPTIONS = ['1:1', '16:9', '9:16'] as const;
const KLING_30_MOTION_CONTROL_RESOLUTION_OPTIONS = ['720p', '1080p'] as const;
const SEEDANCE_1_VIDEO_MODELS = [
  'seedance-1-pro',
  'seedance-1-lite',
  'seedance-1-pro-fast',
] as const;
const SEEDANCE_1_DURATION_OPTIONS = ['5', '10'] as const;
const SEEDANCE_COMMON_ASPECT_RATIO_OPTIONS = [
  '16:9',
  '9:16',
  '1:1',
  '4:3',
  '3:4',
] as const;
const SEEDANCE_WIDE_ASPECT_RATIO_OPTIONS = [
  ...SEEDANCE_COMMON_ASPECT_RATIO_OPTIONS,
  '21:9',
] as const;
const SEEDANCE_2_STABLE_MODELS = [
  'seedance-2-stable',
  'seedance-2-fast-stable',
] as const;
const SEEDANCE_2_STABLE_DURATION_OPTIONS = Array.from(
  { length: 12 },
  (_, index) => String(index + 4)
) as string[];
const SEEDANCE_2_OFFICIAL_MODELS = [
  'seedance-2',
  'seedance-2-fast',
  'seedance-2-ark',
  'seedance-2-fast-ark',
  'seedance-2-mini-ark',
] as const;
const SEEDANCE_2_OFFICIAL_DURATION_OPTIONS = Array.from(
  { length: 12 },
  (_, index) => String(index + 4)
) as string[];
const HAPPYHORSE_TEXT_TO_VIDEO_MODEL = 'happyhorse-1.0-t2v';
const HAPPYHORSE_FIRST_FRAME_MODEL = 'happyhorse-1.0-i2v';
const HAPPYHORSE_REFERENCE_MODEL = 'happyhorse-1.0-r2v';
const HAPPYHORSE_VIDEO_EDIT_MODEL = 'happyhorse-1.0-video-edit';
const HAPPYHORSE_MODELS = [
  HAPPYHORSE_TEXT_TO_VIDEO_MODEL,
  HAPPYHORSE_FIRST_FRAME_MODEL,
  HAPPYHORSE_REFERENCE_MODEL,
  HAPPYHORSE_VIDEO_EDIT_MODEL,
] as const;
const HAPPYHORSE_DURATION_OPTIONS = Array.from({ length: 13 }, (_, index) =>
  String(index + 3)
) as string[];
const HAPPYHORSE_ASPECT_RATIO_OPTIONS = [
  '16:9',
  '9:16',
  '1:1',
  '4:3',
  '3:4',
] as const;
const HAPPYHORSE_RESOLUTION_OPTIONS = ['720P', '1080P'] as const;
const HAILUO_23_MODELS = ['hailuo-2.3-standard', 'hailuo-2.3-pro'] as const;
const HAILUO_23_DURATION_OPTIONS = ['6', '10'] as const;
const HAILUO_23_RESOLUTION_OPTIONS = ['768P', '1080P'] as const;
const VIDEO_MODELS_WITH_SCENELESS_ASPECT_RATIO = new Set<string>([
  GEMINI_OMNI_VIDEO_MODEL,
  'sora-2-pro',
  ...VEO_VIDEO_MODELS,
  ...SEEDANCE_2_STABLE_MODELS,
  ...SEEDANCE_2_OFFICIAL_MODELS,
  HAPPYHORSE_TEXT_TO_VIDEO_MODEL,
  HAPPYHORSE_REFERENCE_MODEL,
]);
const VIDEO_MODELS_WITH_SCENELESS_DURATION = new Set<string>([
  GEMINI_OMNI_VIDEO_MODEL,
  'sora-2-pro',
  ...VEO_VIDEO_MODELS,
  KLING_26_MODEL,
  KLING_30_VIDEO_MODEL,
  ...SEEDANCE_1_VIDEO_MODELS,
  ...SEEDANCE_2_STABLE_MODELS,
  ...SEEDANCE_2_OFFICIAL_MODELS,
  HAPPYHORSE_TEXT_TO_VIDEO_MODEL,
  HAPPYHORSE_FIRST_FRAME_MODEL,
  HAPPYHORSE_REFERENCE_MODEL,
  ...HAILUO_23_MODELS,
]);
const VIDEO_MODELS_WITH_SCENELESS_RESOLUTION = new Set<string>([
  GEMINI_OMNI_VIDEO_MODEL,
  'sora-2-pro',
  KLING_30_MOTION_CONTROL_MODEL,
  ...SEEDANCE_1_VIDEO_MODELS,
  ...SEEDANCE_2_STABLE_MODELS,
  ...SEEDANCE_2_OFFICIAL_MODELS,
  ...HAPPYHORSE_MODELS,
  ...HAILUO_23_MODELS,
]);

function normalizeValue(
  value: unknown,
  options: readonly string[],
  fallback: string
) {
  if (typeof value === 'string') {
    const normalized = value.trim();
    if (normalized && options.includes(normalized)) {
      return normalized;
    }
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    const normalized = String(value);
    if (options.includes(normalized)) {
      return normalized;
    }
  }

  return fallback;
}

export function isMidjourneyCanvasImageModel(model: string): boolean {
  return model === 'midjourney-v7';
}

export function isGptImage2CanvasImageModel(model: string): boolean {
  return (
    model === 'gpt-image-2' ||
    model === 'gpt-image-2-text-to-image' ||
    model === 'gpt-image-2-image-to-image'
  );
}

export function isNanoBanana2CanvasImageModel(model: string): boolean {
  return model === 'nano-banana-2';
}

export function isNanoBananaProCanvasImageModel(model: string): boolean {
  return model === 'nano-banana-pro';
}

export function getCanvasImageAspectRatioOptions(model: string): string[] {
  if (isMidjourneyCanvasImageModel(model)) {
    return [...MIDJOURNEY_IMAGE_ASPECT_RATIO_OPTIONS];
  }

  if (isGptImage2CanvasImageModel(model)) {
    return [...GPT_IMAGE_2_IMAGE_ASPECT_RATIO_OPTIONS];
  }

  if (isNanoBanana2CanvasImageModel(model)) {
    return [...NANO_BANANA_2_IMAGE_ASPECT_RATIO_OPTIONS];
  }

  return [...NANO_BANANA_PRO_IMAGE_ASPECT_RATIO_OPTIONS];
}

export function normalizeCanvasImageSettingsForModel({
  model,
  resolution,
  aspectRatio,
}: {
  model: string;
  resolution: unknown;
  aspectRatio: unknown;
}): {
  resolution: string;
  aspectRatio: string;
} {
  const nextResolution = normalizeValue(resolution, ['1K', '2K', '4K'], '1K');

  if (isMidjourneyCanvasImageModel(model)) {
    return {
      resolution: nextResolution,
      aspectRatio: normalizeValue(
        aspectRatio,
        MIDJOURNEY_IMAGE_ASPECT_RATIO_OPTIONS,
        '1:1'
      ),
    };
  }

  if (isGptImage2CanvasImageModel(model)) {
    const nextAspectRatio = normalizeValue(
      aspectRatio,
      GPT_IMAGE_2_IMAGE_ASPECT_RATIO_OPTIONS,
      'auto'
    );

    if (nextAspectRatio === 'auto') {
      return {
        resolution: '1K',
        aspectRatio: nextAspectRatio,
      };
    }

    if (nextAspectRatio === '1:1' && nextResolution === '4K') {
      return {
        resolution: '2K',
        aspectRatio: nextAspectRatio,
      };
    }

    return {
      resolution: nextResolution,
      aspectRatio: nextAspectRatio,
    };
  }

  const nanoBananaAspectRatioOptions = isNanoBanana2CanvasImageModel(model)
    ? NANO_BANANA_2_IMAGE_ASPECT_RATIO_OPTIONS
    : NANO_BANANA_PRO_IMAGE_ASPECT_RATIO_OPTIONS;

  return {
    resolution: nextResolution,
    aspectRatio: normalizeValue(
      aspectRatio,
      nanoBananaAspectRatioOptions,
      '1:1'
    ),
  };
}

export function getCanvasVideoDurationOptions(
  model: string,
  scene?: AICreditScene | null
): string[] {
  if (!scene && !VIDEO_MODELS_WITH_SCENELESS_DURATION.has(model)) {
    return EMPTY_OPTIONS;
  }

  if (model === GEMINI_OMNI_VIDEO_MODEL) {
    return [...GEMINI_OMNI_VIDEO_DURATION_OPTIONS];
  }

  if (VEO_VIDEO_MODELS.includes(model as (typeof VEO_VIDEO_MODELS)[number])) {
    return [...VEO_VIDEO_DURATION_OPTIONS];
  }

  if (model === 'sora-2-pro') {
    return [...SORA_PRO_DURATION_OPTIONS];
  }

  if (model === KLING_26_MODEL) {
    return [...KLING_26_DURATION_OPTIONS];
  }

  if (model === KLING_30_VIDEO_MODEL) {
    return [...KLING_30_DURATION_OPTIONS];
  }

  if (
    SEEDANCE_1_VIDEO_MODELS.includes(
      model as (typeof SEEDANCE_1_VIDEO_MODELS)[number]
    )
  ) {
    return [...SEEDANCE_1_DURATION_OPTIONS];
  }

  if (
    SEEDANCE_2_STABLE_MODELS.includes(
      model as (typeof SEEDANCE_2_STABLE_MODELS)[number]
    )
  ) {
    return [...SEEDANCE_2_STABLE_DURATION_OPTIONS];
  }

  if (
    SEEDANCE_2_OFFICIAL_MODELS.includes(
      model as (typeof SEEDANCE_2_OFFICIAL_MODELS)[number]
    )
  ) {
    return [...SEEDANCE_2_OFFICIAL_DURATION_OPTIONS];
  }

  if (HAPPYHORSE_MODELS.includes(model as (typeof HAPPYHORSE_MODELS)[number])) {
    return [...HAPPYHORSE_DURATION_OPTIONS];
  }

  if (HAILUO_23_MODELS.includes(model as (typeof HAILUO_23_MODELS)[number])) {
    return [...HAILUO_23_DURATION_OPTIONS];
  }

  return EMPTY_OPTIONS;
}

export function getCanvasVideoAspectRatioOptions(
  model: string,
  scene?: AICreditScene | null
): string[] {
  if (!scene && !VIDEO_MODELS_WITH_SCENELESS_ASPECT_RATIO.has(model)) {
    return EMPTY_OPTIONS;
  }

  if (model === GEMINI_OMNI_VIDEO_MODEL) {
    return [...GEMINI_OMNI_VIDEO_ASPECT_RATIO_OPTIONS];
  }

  if (VEO_VIDEO_MODELS.includes(model as (typeof VEO_VIDEO_MODELS)[number])) {
    return [...VEO_VIDEO_ASPECT_RATIO_OPTIONS];
  }

  if (model === 'sora-2-pro') {
    return [...SORA_PRO_ASPECT_RATIO_OPTIONS];
  }

  if (model === KLING_26_MODEL && scene === 'text-to-video') {
    return [...KLING_26_ASPECT_RATIO_OPTIONS];
  }

  if (model === KLING_30_VIDEO_MODEL && scene === 'text-to-video') {
    return [...KLING_30_ASPECT_RATIO_OPTIONS];
  }

  if (
    SEEDANCE_2_STABLE_MODELS.includes(
      model as (typeof SEEDANCE_2_STABLE_MODELS)[number]
    ) ||
    SEEDANCE_2_OFFICIAL_MODELS.includes(
      model as (typeof SEEDANCE_2_OFFICIAL_MODELS)[number]
    )
  ) {
    return [...SEEDANCE_WIDE_ASPECT_RATIO_OPTIONS];
  }

  if (
    HAPPYHORSE_MODELS.includes(model as (typeof HAPPYHORSE_MODELS)[number]) &&
    model !== HAPPYHORSE_FIRST_FRAME_MODEL &&
    model !== HAPPYHORSE_VIDEO_EDIT_MODEL
  ) {
    return [...HAPPYHORSE_ASPECT_RATIO_OPTIONS];
  }

  return EMPTY_OPTIONS;
}

export function getCanvasVideoResolutionOptions(
  model: string,
  scene?: AICreditScene | null
): string[] {
  if (!scene && !VIDEO_MODELS_WITH_SCENELESS_RESOLUTION.has(model)) {
    return EMPTY_OPTIONS;
  }

  if (model === GEMINI_OMNI_VIDEO_MODEL) {
    return [...GEMINI_OMNI_VIDEO_RESOLUTION_OPTIONS];
  }

  if (model === 'sora-2-pro') {
    return [...SORA_PRO_RESOLUTION_OPTIONS];
  }

  if (model === KLING_30_MOTION_CONTROL_MODEL) {
    return [...KLING_30_MOTION_CONTROL_RESOLUTION_OPTIONS];
  }

  if (model === 'seedance-2-fast-stable' || model === 'seedance-2-fast-ark') {
    return ['480p', '720p'];
  }

  if (
    model === 'seedance-2-stable' ||
    model === 'seedance-2-ark' ||
    model === 'seedance-2-mini-ark' ||
    SEEDANCE_1_VIDEO_MODELS.includes(
      model as (typeof SEEDANCE_1_VIDEO_MODELS)[number]
    )
  ) {
    return ['480p', '720p', '1080p'];
  }

  if (HAPPYHORSE_MODELS.includes(model as (typeof HAPPYHORSE_MODELS)[number])) {
    return [...HAPPYHORSE_RESOLUTION_OPTIONS];
  }

  if (HAILUO_23_MODELS.includes(model as (typeof HAILUO_23_MODELS)[number])) {
    return [...HAILUO_23_RESOLUTION_OPTIONS];
  }

  return EMPTY_OPTIONS;
}

export function shouldSendCanvasVideoAspectRatio(
  model: string,
  scene: AICreditScene
): boolean {
  return getCanvasVideoAspectRatioOptions(model, scene).length > 0;
}

export function shouldSendCanvasVideoResolution(
  model: string,
  scene: AICreditScene
): boolean {
  return getCanvasVideoResolutionOptions(model, scene).length > 0;
}

export function shouldSendCanvasVideoDuration(
  model: string,
  scene: AICreditScene
): boolean {
  return getCanvasVideoDurationOptions(model, scene).length > 0;
}

export function normalizeCanvasVideoSettingsForModel({
  model,
  resolution,
  aspectRatio,
  duration,
}: {
  model: string;
  resolution: unknown;
  aspectRatio: unknown;
  duration: unknown;
}): {
  resolution: string;
  aspectRatio: string;
  duration: string;
} {
  const resolutionOptions = getCanvasVideoResolutionOptions(model);
  const aspectRatioOptions = getCanvasVideoAspectRatioOptions(model);
  const durationOptions = getCanvasVideoDurationOptions(model);

  return {
    resolution: normalizeValue(
      resolution,
      resolutionOptions,
      resolutionOptions[0] || '720p'
    ),
    aspectRatio: normalizeValue(
      aspectRatio,
      aspectRatioOptions,
      aspectRatioOptions[0] || '16:9'
    ),
    duration: normalizeValue(
      duration,
      durationOptions,
      durationOptions[0] || '5'
    ),
  };
}
