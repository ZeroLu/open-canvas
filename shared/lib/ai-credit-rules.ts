import { AIMediaType } from '@/extensions/ai/types';

export type AICreditScene =
  | 'text-to-image'
  | 'image-to-image'
  | 'text-to-video'
  | 'image-to-video'
  | 'video-to-video'
  | 'text-to-music'
  | 'text-to-audio';

export interface AICreditQuoteInput {
  provider?: string | null;
  mediaType: string;
  model?: string | null;
  scene?: string | null;
  options?: Record<string, unknown> | null;
}

export interface AICreditQuoteResult {
  credits: number;
  scene: AICreditScene;
  matchedRule: string | null;
  isFallback: boolean;
}

const FALLBACK_SCENE_CREDITS: Record<AICreditScene, number> = {
  'text-to-image': 2,
  'image-to-image': 4,
  'text-to-video': 6,
  'image-to-video': 8,
  'video-to-video': 10,
  'text-to-music': 10,
  'text-to-audio': 6,
};

const SORA_2_PRO_MODELS = new Set([
  'sora-2-pro-text-to-video',
  'sora-2-pro-image-to-video',
]);
const SORA_2_STABLE_MODELS = new Set([
  'sora-2-text-to-video',
  'sora-2-image-to-video',
  'openai/sora-2',
]);
const KLING_26_MODELS = new Set([
  'kling-2.6/text-to-video',
  'kling-2.6/image-to-video',
]);
const KLING_30_VIDEO_MODELS = new Set(['kling-3.0/video']);
const KLING_30_MOTION_CONTROL_MODELS = new Set(['kling-3.0/motion-control']);
const HAPPYHORSE_TEXT_TO_VIDEO_MODELS = new Set(['happyhorse-1.0-t2v']);
const HAPPYHORSE_IMAGE_TO_VIDEO_MODELS = new Set([
  'happyhorse-1.0-i2v',
  'happyhorse-1.0-r2v',
]);
const HAPPYHORSE_VIDEO_EDIT_MODELS = new Set(['happyhorse-1.0-video-edit']);
const HAILUO_23_STANDARD_MODELS = new Set([
  'hailuo/2-3-image-to-video-standard',
]);
const HAILUO_23_PRO_MODELS = new Set(['hailuo/2-3-image-to-video-pro']);
const VEO_31_QUALITY_MODELS = new Set(['veo3', 'google/veo-3.1']);
const VEO_31_FAST_MODELS = new Set(['veo3_fast']);
const SEEDANCE_PRO_MODELS = new Set([
  'bytedance/v1-pro-text-to-video',
  'bytedance/v1-pro-image-to-video',
]);
const SEEDANCE_LITE_MODELS = new Set([
  'bytedance/v1-lite-text-to-video',
  'bytedance/v1-lite-image-to-video',
]);
const SEEDANCE_PRO_FAST_MODELS = new Set([
  'bytedance/v1-pro-fast-image-to-video',
]);
const GEMINI_OMNI_VIDEO_MODELS = new Set(['gemini-omni-video']);
const SEEDANCE_2_STABLE_MODELS = new Set(['seedance-2-stable']);
const SEEDANCE_2_FAST_STABLE_MODELS = new Set(['seedance-2-fast-stable']);
const SEEDANCE_2_OFFICIAL_MODELS = new Set(['seedance-2']);
const SEEDANCE_2_FAST_OFFICIAL_MODELS = new Set(['seedance-2-fast']);
const SEEDANCE_2_ARK_MODELS = new Set(['seedance-2-ark']);
const SEEDANCE_2_FAST_ARK_MODELS = new Set(['seedance-2-fast-ark']);
const SEEDANCE_2_MINI_ARK_MODELS = new Set(['seedance-2-mini-ark']);
const SEEDANCE_2_PREVIEW_MODELS = new Set(['seedance-2-preview']);
const SEEDANCE_2_FAST_PREVIEW_MODELS = new Set(['seedance-2-fast-preview']);
const SEEDANCE_WATERMARK_REMOVER_MODELS = new Set(['remove-watermark']);
const GPT_IMAGE_2_TEXT_TO_IMAGE_MODELS = new Set(['gpt-image-2-text-to-image']);
const GPT_IMAGE_2_IMAGE_TO_IMAGE_MODELS = new Set([
  'gpt-image-2-image-to-image',
]);
const MIDJOURNEY_V7_MODELS = new Set(['midjourney-v7']);
const NANO_BANANA_2_MODELS = new Set(['nano-banana-2']);
const NANO_BANANA_PRO_MODELS = new Set([
  'nano-banana-pro',
  'google/nano-banana-pro',
  'fal-ai/nano-banana-pro',
]);
const NANO_BANANA_EDIT_MODELS = new Set(['fal-ai/nano-banana-pro/edit']);

const SORA_2_PRO_MATRIX = {
  high: { '10': 165, '15': 315 },
  standard: { '10': 75, '15': 135 },
} as const;

const SEEDANCE_PRO_MATRIX = {
  '480p': { '5': 14, '10': 28 },
  '720p': { '5': 30, '10': 60 },
  '1080p': { '5': 70, '10': 140 },
} as const;

const SEEDANCE_LITE_MATRIX = {
  '480p': { '5': 10, '10': 20 },
  '720p': { '5': 25, '10': 45 },
  '1080p': { '5': 50, '10': 100 },
} as const;

const SEEDANCE_PRO_FAST_MATRIX = {
  '720p': { '5': 16, '10': 36 },
  '1080p': { '5': 36, '10': 72 },
} as const;
const GEMINI_OMNI_STANDARD_MATRIX = {
  '4': 30,
  '6': 40,
  '8': 50,
  '10': 60,
} as const;
const GEMINI_OMNI_4K_MATRIX = {
  '4': 70,
  '6': 80,
  '8': 90,
  '10': 100,
} as const;
const HAILUO_23_STANDARD_MATRIX = {
  '768p': { '6': 25, '10': 40 },
  '1080p': { '6': 40 },
} as const;
const HAILUO_23_PRO_MATRIX = {
  '768p': { '6': 40, '10': 80 },
  '1080p': { '6': 70 },
} as const;

const SEEDANCE_2_OFFICIAL_PER_SECOND = 20;
const SEEDANCE_2_FAST_OFFICIAL_PER_SECOND = 16;
const SEEDANCE_2_PREVIEW_TEXT_IMAGE_PER_SECOND = 36;
const SEEDANCE_2_PREVIEW_VIDEO_EDIT_PER_SECOND = 60;
const SEEDANCE_2_FAST_PREVIEW_TEXT_IMAGE_PER_SECOND = 24;
const SEEDANCE_2_FAST_PREVIEW_VIDEO_EDIT_PER_SECOND = 40;
const SEEDANCE_2_ARK_DISCOUNT = 0.8;
const SEEDANCE_2_ARK_RATE_MATRIX = {
  output: {
    '480p': 19,
    '720p': 41,
    '1080p': 102,
  },
  videoInput: {
    '480p': 11.5,
    '720p': 25,
    '1080p': 62,
  },
} as const;
const SEEDANCE_2_FAST_ARK_RATE_MATRIX = {
  output: {
    '480p': 15.5,
    '720p': 33,
  },
  videoInput: {
    '480p': 9,
    '720p': 20,
  },
} as const;
const KLING_30_ALLOWED_DURATIONS = Array.from(
  { length: 13 },
  (_, index) => index + 3
);

function normalizeText(value: unknown): string {
  if (typeof value !== 'string') {
    return '';
  }
  return value.trim().toLowerCase();
}

function toOptions(
  options: AICreditQuoteInput['options']
): Record<string, unknown> {
  if (!options || typeof options !== 'object' || Array.isArray(options)) {
    return {};
  }
  return options;
}

function normalizeDuration(
  rawValue: unknown,
  allowed: readonly number[],
  fallback: number
): number {
  const value = String(rawValue ?? '').trim();
  if (!value) {
    return fallback;
  }

  const match = value.match(/\d+(\.\d+)?/);
  if (!match) {
    return fallback;
  }

  const parsed = Number(match[0]);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  let nearest = allowed[0];
  let minDistance = Math.abs(parsed - nearest);
  for (const candidate of allowed.slice(1)) {
    const distance = Math.abs(parsed - candidate);
    if (distance < minDistance) {
      nearest = candidate;
      minDistance = distance;
    }
  }

  return nearest;
}

function normalizePositiveNumber(value: unknown, fallback: number): number {
  const parsed = Number(String(value ?? '').trim());
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}

function ceilCredits(value: number): number {
  return Math.ceil(Number(value.toFixed(10)));
}

function hasNonEmptyStringArrayValue(value: unknown): boolean {
  if (!Array.isArray(value)) {
    return false;
  }

  return value.some(
    (item) => typeof item === 'string' && Boolean(item.trim().length)
  );
}

function normalizeSeedanceResolution(
  value: unknown,
  fallback: '480p' | '720p' | '1080p'
): '480p' | '720p' | '1080p' {
  const normalized = normalizeText(value);
  if (normalized.includes('1080')) {
    return '1080p';
  }
  if (normalized.includes('720')) {
    return '720p';
  }
  if (normalized.includes('480')) {
    return '480p';
  }
  return fallback;
}

function hasSeedanceVideoInput(options: Record<string, unknown>): boolean {
  return (
    hasNonEmptyStringArrayValue(options.video_input) ||
    Boolean(typeof options.video_url === 'string' && options.video_url.trim())
  );
}

function normalizeSeedanceStableResolution(
  value: unknown
): '480p' | '720p' | '1080p' {
  const normalized = normalizeText(value);
  if (normalized.includes('1080')) {
    return '1080p';
  }
  return normalized.includes('480') ? '480p' : '720p';
}

function normalizeSoraProResolution(value: unknown): 'high' | 'standard' {
  const normalized = normalizeText(value);
  if (normalized === 'high') {
    return 'high';
  }
  return 'standard';
}

function normalizeKling3Mode(value: unknown): 'std' | 'pro' {
  const normalized = normalizeText(value);
  if (normalized === 'pro') {
    return 'pro';
  }
  return 'std';
}

function normalizeKlingMotionResolution(value: unknown): '720p' | '1080p' {
  const normalized = normalizeText(value);
  if (normalized.includes('1080') || normalized === 'pro') {
    return '1080p';
  }
  return '720p';
}

function normalizeHappyHorseResolution(value: unknown): '720p' | '1080p' {
  const normalized = normalizeText(value);
  return normalized.includes('720') ? '720p' : '1080p';
}

function normalizeHailuo23Resolution(value: unknown): '768p' | '1080p' {
  const normalized = normalizeText(value);
  return normalized.includes('1080') ? '1080p' : '768p';
}

function normalizeNanoBananaResolution(
  value: unknown,
  fallback: '1k' | '2k' | '4k'
): '1k' | '2k' | '4k' {
  const normalized = normalizeText(value);
  if (normalized.includes('4k')) {
    return '4k';
  }
  if (normalized.includes('2k')) {
    return '2k';
  }
  if (normalized.includes('1k')) {
    return '1k';
  }
  return fallback;
}

function normalizeGeminiOmniResolution(
  value: unknown
): '720p' | '1080p' | '4k' {
  const normalized = normalizeText(value);
  if (normalized === '4k') {
    return '4k';
  }
  if (normalized === '1080p') {
    return '1080p';
  }
  return '720p';
}

function quoteVideoCreditsByModel({
  model,
  options,
}: {
  model: string;
  options: Record<string, unknown>;
}): Omit<AICreditQuoteResult, 'scene' | 'isFallback'> | null {
  if (SORA_2_PRO_MODELS.has(model)) {
    const resolution = normalizeSoraProResolution(
      options.size ?? options.resolution
    );
    const duration = normalizeDuration(
      options.duration ?? options.n_frames,
      [10, 15],
      10
    );

    return {
      credits: SORA_2_PRO_MATRIX[resolution][String(duration) as '10' | '15'],
      matchedRule: 'sora-2-pro',
    };
  }

  if (SORA_2_STABLE_MODELS.has(model)) {
    const duration = normalizeDuration(
      options.duration ?? options.n_frames,
      [10, 15],
      10
    );

    return {
      credits: duration === 15 ? 30 : 20,
      matchedRule: 'sora-2-stable',
    };
  }

  if (KLING_26_MODELS.has(model)) {
    const duration = normalizeDuration(options.duration, [5, 10], 5);
    const withAudio = options.sound === true;
    const baseCredits = duration === 10 ? 110 : 55;

    return {
      credits: withAudio ? baseCredits * 2 : baseCredits,
      matchedRule: 'kling-2.6',
    };
  }

  if (KLING_30_VIDEO_MODELS.has(model)) {
    const duration = normalizeDuration(
      options.duration,
      KLING_30_ALLOWED_DURATIONS,
      5
    );
    const withAudio = options.sound === true;
    const mode = normalizeKling3Mode(options.mode);
    const rate = mode === 'pro' ? (withAudio ? 27 : 18) : withAudio ? 20 : 14;

    return {
      credits: Math.ceil(duration * rate),
      matchedRule: 'kling-3.0-video',
    };
  }

  if (KLING_30_MOTION_CONTROL_MODELS.has(model)) {
    const resolution = normalizeKlingMotionResolution(options.mode);
    const duration = Math.min(
      normalizePositiveNumber(
        options.input_video_duration ?? options.duration,
        5
      ),
      30
    );
    const rate = resolution === '1080p' ? 27 : 20;

    return {
      credits: Math.ceil(duration * rate),
      matchedRule: 'kling-3.0-motion-control',
    };
  }

  if (
    HAPPYHORSE_TEXT_TO_VIDEO_MODELS.has(model) ||
    HAPPYHORSE_IMAGE_TO_VIDEO_MODELS.has(model)
  ) {
    const resolution = normalizeHappyHorseResolution(options.resolution);
    const duration = normalizeDuration(
      options.duration,
      Array.from({ length: 13 }, (_, index) => index + 3),
      5
    );
    const rate = resolution === '1080p' ? 50 : 30;

    return {
      credits: Math.ceil(duration * rate),
      matchedRule: 'happyhorse-video',
    };
  }

  if (HAPPYHORSE_VIDEO_EDIT_MODELS.has(model)) {
    const resolution = normalizeHappyHorseResolution(options.resolution);
    const rate = resolution === '1080p' ? 50 : 30;
    const effectiveInputDuration = Math.min(
      normalizePositiveNumber(options.input_video_duration, 0),
      15
    );
    const billableDuration =
      effectiveInputDuration > 0 ? effectiveInputDuration * 2 : 0;

    return {
      credits: Math.ceil(billableDuration * rate),
      matchedRule: 'happyhorse-video-edit',
    };
  }

  if (HAILUO_23_STANDARD_MODELS.has(model) || HAILUO_23_PRO_MODELS.has(model)) {
    const resolution = normalizeHailuo23Resolution(options.resolution);
    const duration =
      resolution === '1080p'
        ? '6'
        : normalizeDuration(options.duration, [6, 10], 6) === 10
          ? '10'
          : '6';
    const matrix = HAILUO_23_PRO_MODELS.has(model)
      ? HAILUO_23_PRO_MATRIX
      : HAILUO_23_STANDARD_MATRIX;
    const credits =
      resolution === '1080p' ? matrix['1080p']['6'] : matrix['768p'][duration];

    return {
      credits,
      matchedRule: HAILUO_23_PRO_MODELS.has(model)
        ? 'hailuo-2.3-pro'
        : 'hailuo-2.3-standard',
    };
  }

  if (VEO_31_QUALITY_MODELS.has(model)) {
    return {
      credits: 150,
      matchedRule: 'veo-3.1-quality',
    };
  }

  if (VEO_31_FAST_MODELS.has(model)) {
    return {
      credits: 20,
      matchedRule: 'veo-3.1-fast',
    };
  }

  if (GEMINI_OMNI_VIDEO_MODELS.has(model)) {
    const hasVideoInput = hasSeedanceVideoInput(options);
    const resolution = normalizeGeminiOmniResolution(options.resolution);

    if (hasVideoInput) {
      return {
        credits: resolution === '4k' ? 120 : 80,
        matchedRule: 'gemini-omni-video',
      };
    }

    const duration = normalizeDuration(options.duration, [4, 6, 8, 10], 10);
    const durationKey = String(
      duration
    ) as keyof typeof GEMINI_OMNI_STANDARD_MATRIX;

    return {
      credits:
        resolution === '4k'
          ? GEMINI_OMNI_4K_MATRIX[durationKey]
          : GEMINI_OMNI_STANDARD_MATRIX[durationKey],
      matchedRule: 'gemini-omni-video',
    };
  }

  if (SEEDANCE_2_OFFICIAL_MODELS.has(model)) {
    const outputDuration = Math.min(
      normalizePositiveNumber(options.duration, 5),
      15
    );
    const hasVideoInput = hasSeedanceVideoInput(options);
    const inputVideoDuration = hasVideoInput
      ? Math.min(
          normalizePositiveNumber(options.input_video_duration, outputDuration),
          15.4
        )
      : 0;

    return {
      credits: Math.ceil(
        (hasVideoInput ? inputVideoDuration + outputDuration : outputDuration) *
          SEEDANCE_2_OFFICIAL_PER_SECOND
      ),
      matchedRule: 'seedance-2',
    };
  }

  if (SEEDANCE_2_ARK_MODELS.has(model)) {
    const outputDuration = Math.min(
      normalizePositiveNumber(options.duration, 15),
      15
    );
    const hasVideoInput = hasSeedanceVideoInput(options);
    const inputVideoDuration = hasVideoInput
      ? Math.min(
          normalizePositiveNumber(options.input_video_duration, outputDuration),
          15
        )
      : 0;
    const resolution = normalizeSeedanceStableResolution(options.resolution);
    const rate = hasVideoInput
      ? SEEDANCE_2_ARK_RATE_MATRIX.videoInput[resolution]
      : SEEDANCE_2_ARK_RATE_MATRIX.output[resolution];

    return {
      credits: ceilCredits(
        rate *
          SEEDANCE_2_ARK_DISCOUNT *
          (hasVideoInput ? inputVideoDuration + outputDuration : outputDuration)
      ),
      matchedRule: 'seedance-2-ark',
    };
  }

  if (SEEDANCE_2_FAST_OFFICIAL_MODELS.has(model)) {
    const outputDuration = Math.min(
      normalizePositiveNumber(options.duration, 5),
      15
    );
    const hasVideoInput = hasSeedanceVideoInput(options);
    const inputVideoDuration = hasVideoInput
      ? Math.min(
          normalizePositiveNumber(options.input_video_duration, outputDuration),
          15.4
        )
      : 0;

    return {
      credits: Math.ceil(
        (hasVideoInput ? inputVideoDuration + outputDuration : outputDuration) *
          SEEDANCE_2_FAST_OFFICIAL_PER_SECOND
      ),
      matchedRule: 'seedance-2-fast',
    };
  }

  if (SEEDANCE_2_FAST_ARK_MODELS.has(model)) {
    const outputDuration = Math.min(
      normalizePositiveNumber(options.duration, 15),
      15
    );
    const hasVideoInput = hasSeedanceVideoInput(options);
    const inputVideoDuration = hasVideoInput
      ? Math.min(
          normalizePositiveNumber(options.input_video_duration, outputDuration),
          15
        )
      : 0;
    const resolution = normalizeSeedanceStableResolution(options.resolution);
    const fastResolution = resolution === '480p' ? '480p' : '720p';
    const rate = hasVideoInput
      ? SEEDANCE_2_FAST_ARK_RATE_MATRIX.videoInput[fastResolution]
      : SEEDANCE_2_FAST_ARK_RATE_MATRIX.output[fastResolution];

    return {
      credits: ceilCredits(
        rate *
          SEEDANCE_2_ARK_DISCOUNT *
          (hasVideoInput ? inputVideoDuration + outputDuration : outputDuration)
      ),
      matchedRule: 'seedance-2-fast-ark',
    };
  }

  if (SEEDANCE_2_MINI_ARK_MODELS.has(model)) {
    const outputDuration = Math.min(
      normalizePositiveNumber(options.duration, 15),
      15
    );
    const hasVideoInput = hasSeedanceVideoInput(options);
    const inputVideoDuration = hasVideoInput
      ? Math.min(
          normalizePositiveNumber(options.input_video_duration, outputDuration),
          15
        )
      : 0;
    const resolution = normalizeSeedanceStableResolution(options.resolution);
    const baseRate = hasVideoInput
      ? SEEDANCE_2_ARK_RATE_MATRIX.videoInput[resolution]
      : SEEDANCE_2_ARK_RATE_MATRIX.output[resolution];

    return {
      credits: ceilCredits(
        (baseRate / 2) *
          (hasVideoInput ? inputVideoDuration + outputDuration : outputDuration)
      ),
      matchedRule: 'seedance-2-mini-ark',
    };
  }

  if (SEEDANCE_2_STABLE_MODELS.has(model)) {
    const outputDuration = Math.min(
      normalizePositiveNumber(options.duration, 15),
      15
    );
    const hasVideoInput = hasSeedanceVideoInput(options);
    const inputVideoDuration = hasVideoInput
      ? Math.min(
          normalizePositiveNumber(options.input_video_duration, outputDuration),
          15
        )
      : 0;
    const resolution = normalizeSeedanceStableResolution(options.resolution);
    const rate = hasVideoInput
      ? resolution === '480p'
        ? 11.5
        : resolution === '1080p'
          ? 62
          : 25
      : resolution === '480p'
        ? 19
        : resolution === '1080p'
          ? 102
          : 41;

    return {
      credits: Math.ceil(
        rate *
          (hasVideoInput ? inputVideoDuration + outputDuration : outputDuration)
      ),
      matchedRule: 'seedance-2-stable',
    };
  }

  if (SEEDANCE_2_FAST_STABLE_MODELS.has(model)) {
    const outputDuration = Math.min(
      normalizePositiveNumber(options.duration, 15),
      15
    );
    const hasVideoInput = hasSeedanceVideoInput(options);
    const inputVideoDuration = hasVideoInput
      ? Math.min(
          normalizePositiveNumber(options.input_video_duration, outputDuration),
          15
        )
      : 0;
    const resolution = normalizeSeedanceStableResolution(options.resolution);
    const rate = hasVideoInput
      ? resolution === '480p'
        ? 9
        : 20
      : resolution === '480p'
        ? 15.5
        : 33;

    return {
      credits: Math.ceil(
        rate *
          (hasVideoInput ? inputVideoDuration + outputDuration : outputDuration)
      ),
      matchedRule: 'seedance-2-fast-stable',
    };
  }

  if (SEEDANCE_2_PREVIEW_MODELS.has(model)) {
    const outputDuration = Math.min(
      normalizePositiveNumber(options.duration, 5),
      15
    );
    const hasVideoInput = hasSeedanceVideoInput(options);
    const billableDuration = hasVideoInput
      ? Math.min(
          normalizePositiveNumber(options.input_video_duration, outputDuration),
          15
        )
      : outputDuration;
    const rate = hasVideoInput
      ? SEEDANCE_2_PREVIEW_VIDEO_EDIT_PER_SECOND
      : SEEDANCE_2_PREVIEW_TEXT_IMAGE_PER_SECOND;

    return {
      credits: Math.ceil(billableDuration * rate),
      matchedRule: 'seedance-2-preview',
    };
  }

  if (SEEDANCE_2_FAST_PREVIEW_MODELS.has(model)) {
    const outputDuration = Math.min(
      normalizePositiveNumber(options.duration, 5),
      15
    );
    const hasVideoInput = hasSeedanceVideoInput(options);
    const billableDuration = hasVideoInput
      ? Math.min(
          normalizePositiveNumber(options.input_video_duration, outputDuration),
          15
        )
      : outputDuration;
    const rate = hasVideoInput
      ? SEEDANCE_2_FAST_PREVIEW_VIDEO_EDIT_PER_SECOND
      : SEEDANCE_2_FAST_PREVIEW_TEXT_IMAGE_PER_SECOND;

    return {
      credits: Math.ceil(billableDuration * rate),
      matchedRule: 'seedance-2-fast-preview',
    };
  }

  if (SEEDANCE_WATERMARK_REMOVER_MODELS.has(model)) {
    const duration = normalizePositiveNumber(options.duration, 5);
    const credits = Math.max(4, Math.ceil(duration * 0.8));
    return {
      credits,
      matchedRule: 'seedance-watermark-remover',
    };
  }

  if (SEEDANCE_PRO_MODELS.has(model)) {
    const resolution = normalizeSeedanceResolution(options.resolution, '720p');
    const duration = normalizeDuration(options.duration, [5, 10], 5);

    return {
      credits: SEEDANCE_PRO_MATRIX[resolution][String(duration) as '5' | '10'],
      matchedRule: 'seedance-v1-pro',
    };
  }

  if (SEEDANCE_LITE_MODELS.has(model)) {
    const resolution = normalizeSeedanceResolution(options.resolution, '720p');
    const duration = normalizeDuration(options.duration, [5, 10], 5);

    return {
      credits: SEEDANCE_LITE_MATRIX[resolution][String(duration) as '5' | '10'],
      matchedRule: 'seedance-v1-lite',
    };
  }

  if (SEEDANCE_PRO_FAST_MODELS.has(model)) {
    const resolution = normalizeSeedanceResolution(options.resolution, '720p');
    const normalizedResolution = resolution === '480p' ? '720p' : resolution;
    const duration = normalizeDuration(options.duration, [5, 10], 5);

    return {
      credits:
        SEEDANCE_PRO_FAST_MATRIX[normalizedResolution][
          String(duration) as '5' | '10'
        ],
      matchedRule: 'seedance-v1-pro-fast',
    };
  }

  return null;
}

function quoteImageCreditsByModel({
  model,
  options,
}: {
  model: string;
  options: Record<string, unknown>;
}): Omit<AICreditQuoteResult, 'scene' | 'isFallback'> | null {
  if (GPT_IMAGE_2_TEXT_TO_IMAGE_MODELS.has(model)) {
    const resolution = normalizeNanoBananaResolution(
      options.resolution ?? options.size,
      '1k'
    );
    const creditMap: Record<'1k' | '2k' | '4k', number> = {
      '1k': 6,
      '2k': 10,
      '4k': 16,
    };

    return {
      credits: creditMap[resolution],
      matchedRule: 'gpt-image-2',
    };
  }

  if (GPT_IMAGE_2_IMAGE_TO_IMAGE_MODELS.has(model)) {
    const resolution = normalizeNanoBananaResolution(
      options.resolution ?? options.size,
      '1k'
    );
    const creditMap: Record<'1k' | '2k' | '4k', number> = {
      '1k': 6,
      '2k': 10,
      '4k': 16,
    };

    return {
      credits: creditMap[resolution],
      matchedRule: 'gpt-image-2',
    };
  }

  if (MIDJOURNEY_V7_MODELS.has(model)) {
    return {
      credits: 16,
      matchedRule: 'midjourney-v7',
    };
  }

  if (NANO_BANANA_2_MODELS.has(model)) {
    const resolution = normalizeNanoBananaResolution(options.resolution, '1k');
    const creditMap: Record<'1k' | '2k' | '4k', number> = {
      '1k': 8,
      '2k': 12,
      '4k': 18,
    };

    return {
      credits: creditMap[resolution],
      matchedRule: 'nano-banana-2',
    };
  }

  if (NANO_BANANA_EDIT_MODELS.has(model)) {
    return {
      credits: 4,
      matchedRule: 'nano-banana-edit',
    };
  }

  if (NANO_BANANA_PRO_MODELS.has(model)) {
    const resolution = normalizeNanoBananaResolution(options.resolution, '2k');

    return {
      credits: resolution === '4k' ? 24 : 18,
      matchedRule: 'nano-banana-pro',
    };
  }

  return null;
}

export function normalizeAICreditScene({
  mediaType,
  scene,
}: {
  mediaType: string;
  scene?: string | null;
}): AICreditScene | null {
  const normalizedMediaType = normalizeText(mediaType);
  const normalizedScene = normalizeText(scene);

  if (normalizedMediaType === AIMediaType.IMAGE) {
    if (
      normalizedScene === 'text-to-image' ||
      normalizedScene === 'image-to-image'
    ) {
      return normalizedScene;
    }
    return null;
  }

  if (normalizedMediaType === AIMediaType.VIDEO) {
    if (
      normalizedScene === 'text-to-video' ||
      normalizedScene === 'image-to-video' ||
      normalizedScene === 'video-to-video'
    ) {
      return normalizedScene;
    }
    return null;
  }

  if (normalizedMediaType === AIMediaType.MUSIC) {
    if (!normalizedScene || normalizedScene === 'text-to-music') {
      return 'text-to-music';
    }
    return null;
  }

  if (normalizedMediaType === AIMediaType.AUDIO) {
    if (!normalizedScene || normalizedScene === 'text-to-audio') {
      return 'text-to-audio';
    }
    return null;
  }

  return null;
}

export function quoteAICredits(input: AICreditQuoteInput): AICreditQuoteResult {
  const model = normalizeText(input.model);
  const options = toOptions(input.options);
  const scene = normalizeAICreditScene({
    mediaType: input.mediaType,
    scene: input.scene,
  });

  if (!scene) {
    const normalizedMediaType = normalizeText(input.mediaType);
    if (
      normalizedMediaType !== AIMediaType.IMAGE &&
      normalizedMediaType !== AIMediaType.VIDEO &&
      normalizedMediaType !== AIMediaType.MUSIC &&
      normalizedMediaType !== AIMediaType.AUDIO
    ) {
      throw new Error('invalid mediaType');
    }
    throw new Error('invalid scene');
  }

  if (scene === 'text-to-music' || scene === 'text-to-audio') {
    return {
      credits: FALLBACK_SCENE_CREDITS[scene],
      scene,
      matchedRule:
        scene === 'text-to-music' ? 'music-default' : 'audio-default',
      isFallback: false,
    };
  }

  if (scene === 'text-to-image' || scene === 'image-to-image') {
    const quote = quoteImageCreditsByModel({ model, options });
    if (quote) {
      return {
        ...quote,
        scene,
        isFallback: false,
      };
    }
  }

  if (
    scene === 'text-to-video' ||
    scene === 'image-to-video' ||
    scene === 'video-to-video'
  ) {
    const quote = quoteVideoCreditsByModel({ model, options });
    if (quote) {
      return {
        ...quote,
        scene,
        isFallback: false,
      };
    }
  }

  return {
    credits: FALLBACK_SCENE_CREDITS[scene],
    scene,
    matchedRule: null,
    isFallback: true,
  };
}
