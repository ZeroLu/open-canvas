export const CANVAS_LOCALES = ['en', 'zh'] as const;

export type CanvasLocale = (typeof CANVAS_LOCALES)[number];

type CanvasNodeType = 'text' | 'note' | 'image' | 'audio' | 'video';

export const DEFAULT_NODE_COPY: Record<
  CanvasLocale,
  Record<
    CanvasNodeType,
    {
      title: string;
      subtitle: string;
    }
  > & {
    untitledCanvas: string;
    untitledCanvasNumber: string;
    untitledNode: string;
    any: string;
  }
> = {
  en: {
    text: {
      title: 'Text Node',
      subtitle: 'For prompts, notes, or generated copy.',
    },
    note: {
      title: 'Note Node',
      subtitle: 'For explanations and rich notes.',
    },
    image: {
      title: 'Image Node',
      subtitle: 'For references, uploads, or generated still images.',
    },
    audio: {
      title: 'Audio Node',
      subtitle: 'For uploaded clips, sound effects, or generated audio.',
    },
    video: {
      title: 'Video Node',
      subtitle: 'For timeline output, motion references, or generated video.',
    },
    untitledCanvas: 'Untitled Canvas',
    untitledCanvasNumber: 'Untitled Canvas {index}',
    untitledNode: 'Untitled Node',
    any: 'Any',
  },
  zh: {
    text: {
      title: '文本节点',
      subtitle: '用于提示词、备注或生成文案。',
    },
    note: {
      title: 'Note 节点',
      subtitle: '用于解释说明和富文本备注。',
    },
    image: {
      title: '图片节点',
      subtitle: '用于参考图、上传图片或生成静态图。',
    },
    audio: {
      title: '音频节点',
      subtitle: '用于上传片段、音效或生成音频。',
    },
    video: {
      title: '视频节点',
      subtitle: '用于时间线输出、运动参考或生成视频。',
    },
    untitledCanvas: '未命名画布',
    untitledCanvasNumber: '未命名画布 {index}',
    untitledNode: '未命名节点',
    any: '不限',
  },
};

export function resolveCanvasLocale(locale?: string | null): CanvasLocale {
  const normalized = String(locale || '')
    .trim()
    .toLowerCase()
    .split('-')[0];

  return CANVAS_LOCALES.includes(normalized as CanvasLocale)
    ? (normalized as CanvasLocale)
    : 'en';
}

export function getDefaultCanvasNodeCopy(
  locale: string | null | undefined,
  nodeType: CanvasNodeType
) {
  return DEFAULT_NODE_COPY[resolveCanvasLocale(locale)][nodeType];
}

export function getDefaultCanvasUntitledCanvas(
  locale: string | null | undefined,
  index?: number | null
): string {
  const copy = DEFAULT_NODE_COPY[resolveCanvasLocale(locale)];
  if (typeof index === 'number' && Number.isFinite(index)) {
    return copy.untitledCanvasNumber.replace(
      '{index}',
      String(Math.max(1, Math.floor(index)))
    );
  }

  return copy.untitledCanvas;
}

export function normalizeCanvasSoundKey(value: unknown): string {
  const normalized = typeof value === 'string' ? value.trim() : '';
  if (!normalized) {
    return 'Any';
  }

  return normalized === 'Any' || normalized === DEFAULT_NODE_COPY.zh.any
    ? 'Any'
    : normalized;
}
