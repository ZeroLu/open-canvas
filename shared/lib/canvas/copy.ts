export const CANVAS_LOCALES = ['en', 'zh', 'ja', 'de', 'fr', 'es'] as const;

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
  ja: {
    text: {
      title: 'テキストノード',
      subtitle: 'プロンプト、メモ、生成テキストに使用します。',
    },
    note: {
      title: 'ノートノード',
      subtitle: '説明やリッチテキストメモに使用します。',
    },
    image: {
      title: '画像ノード',
      subtitle: '参照画像、アップロード画像、生成静止画に使用します。',
    },
    audio: {
      title: '音声ノード',
      subtitle: 'アップロード音声、効果音、生成音声に使用します。',
    },
    video: {
      title: '動画ノード',
      subtitle: 'タイムライン出力、モーション参照、生成動画に使用します。',
    },
    untitledCanvas: '無題のキャンバス',
    untitledCanvasNumber: '無題のキャンバス {index}',
    untitledNode: '無題のノード',
    any: '指定なし',
  },
  de: {
    text: {
      title: 'Textknoten',
      subtitle: 'Für Prompts, Notizen oder generierten Text.',
    },
    note: {
      title: 'Notizknoten',
      subtitle: 'Für Erklärungen und formatierte Notizen.',
    },
    image: {
      title: 'Bildknoten',
      subtitle: 'Für Referenzen, Uploads oder generierte Standbilder.',
    },
    audio: {
      title: 'Audioknoten',
      subtitle: 'Für hochgeladene Clips, Soundeffekte oder generiertes Audio.',
    },
    video: {
      title: 'Videoknoten',
      subtitle: 'Für Timeline-Ausgabe, Bewegungsreferenzen oder generierte Videos.',
    },
    untitledCanvas: 'Unbenanntes Canvas',
    untitledCanvasNumber: 'Unbenanntes Canvas {index}',
    untitledNode: 'Unbenannter Knoten',
    any: 'Beliebig',
  },
  fr: {
    text: {
      title: 'Nœud texte',
      subtitle: 'Pour les prompts, les notes ou le texte généré.',
    },
    note: {
      title: 'Nœud note',
      subtitle: 'Pour les explications et les notes enrichies.',
    },
    image: {
      title: 'Nœud image',
      subtitle: 'Pour les références, les imports ou les images fixes générées.',
    },
    audio: {
      title: 'Nœud audio',
      subtitle: 'Pour les extraits importés, les effets sonores ou l’audio généré.',
    },
    video: {
      title: 'Nœud vidéo',
      subtitle: 'Pour la sortie de timeline, les références de mouvement ou la vidéo générée.',
    },
    untitledCanvas: 'Canvas sans titre',
    untitledCanvasNumber: 'Canvas sans titre {index}',
    untitledNode: 'Nœud sans titre',
    any: 'Aucune',
  },
  es: {
    text: {
      title: 'Nodo de texto',
      subtitle: 'Para prompts, notas o texto generado.',
    },
    note: {
      title: 'Nodo de nota',
      subtitle: 'Para explicaciones y notas enriquecidas.',
    },
    image: {
      title: 'Nodo de imagen',
      subtitle: 'Para referencias, archivos subidos o imágenes fijas generadas.',
    },
    audio: {
      title: 'Nodo de audio',
      subtitle: 'Para clips subidos, efectos de sonido o audio generado.',
    },
    video: {
      title: 'Nodo de video',
      subtitle: 'Para salida de línea de tiempo, referencias de movimiento o video generado.',
    },
    untitledCanvas: 'Canvas sin título',
    untitledCanvasNumber: 'Canvas sin título {index}',
    untitledNode: 'Nodo sin título',
    any: 'Cualquiera',
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
