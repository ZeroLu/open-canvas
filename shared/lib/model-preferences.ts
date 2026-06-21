export type ModelPreferenceOptions = Record<
  string,
  string | number | boolean | null | undefined
>;

export interface MediaModelPreferences {
  model?: string;
  optionsByModel?: Record<string, ModelPreferenceOptions>;
}

export interface CanvasModelPreferences {
  image?: MediaModelPreferences;
  video?: MediaModelPreferences;
}

const GENERATOR_IMAGE_KEY = 'cyberbara.generator.image.preferences.v1';
const GENERATOR_VIDEO_KEY = 'cyberbara.generator.video.preferences.v1';
const CANVAS_KEY = 'cyberbara.canvas.preferences.v1';

function canUseLocalStorage() {
  try {
    return typeof window !== 'undefined' && !!window.localStorage;
  } catch {
    return false;
  }
}

function readJson<T>(key: string, fallback: T): T {
  if (!canUseLocalStorage()) {
    return fallback;
  }

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      return fallback;
    }

    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T) {
  if (!canUseLocalStorage()) {
    return;
  }

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage quota and privacy-mode failures.
  }
}

function sanitizeOptions(options: ModelPreferenceOptions) {
  return Object.fromEntries(
    Object.entries(options).filter(([, value]) => value !== undefined)
  );
}

function updateMediaPreferences(
  key: string,
  model: string,
  options: ModelPreferenceOptions
) {
  const current = readJson<MediaModelPreferences>(key, {});
  writeJson<MediaModelPreferences>(key, {
    ...current,
    model,
    optionsByModel: {
      ...(current.optionsByModel || {}),
      [model]: sanitizeOptions(options),
    },
  });
}

export function readGeneratorImagePreferences() {
  return readJson<MediaModelPreferences>(GENERATOR_IMAGE_KEY, {});
}

export function writeGeneratorImagePreferences(
  model: string,
  options: ModelPreferenceOptions
) {
  updateMediaPreferences(GENERATOR_IMAGE_KEY, model, options);
}

export function readGeneratorVideoPreferences() {
  return readJson<MediaModelPreferences>(GENERATOR_VIDEO_KEY, {});
}

export function writeGeneratorVideoPreferences(
  model: string,
  options: ModelPreferenceOptions
) {
  updateMediaPreferences(GENERATOR_VIDEO_KEY, model, options);
}

export function readCanvasModelPreferences() {
  return readJson<CanvasModelPreferences>(CANVAS_KEY, {});
}

export function writeCanvasModelPreferences(
  mediaType: 'image' | 'video',
  model: string,
  options: ModelPreferenceOptions
) {
  const current = readCanvasModelPreferences();
  const currentMedia = current[mediaType] || {};

  writeJson<CanvasModelPreferences>(CANVAS_KEY, {
    ...current,
    [mediaType]: {
      ...currentMedia,
      model,
      optionsByModel: {
        ...(currentMedia.optionsByModel || {}),
        [model]: sanitizeOptions(options),
      },
    },
  });
}
