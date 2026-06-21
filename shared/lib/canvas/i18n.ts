import { CANVAS_LOCALES, DEFAULT_NODE_COPY } from '@/shared/lib/canvas/copy';

type CanvasNodeType = 'text' | 'note' | 'image' | 'audio' | 'video';

type CanvasTranslationValues = Record<string, string | number>;

export type CanvasTranslator = (
  key: string,
  values?: CanvasTranslationValues
) => string;

const DEFAULT_NODE_TITLES = {
  'common.textNode': CANVAS_LOCALES.map((locale) => DEFAULT_NODE_COPY[locale].text.title),
  'common.noteNode': CANVAS_LOCALES.map((locale) => DEFAULT_NODE_COPY[locale].note.title),
  'common.imageNode': CANVAS_LOCALES.map((locale) => DEFAULT_NODE_COPY[locale].image.title),
  'common.audioNode': CANVAS_LOCALES.map((locale) => DEFAULT_NODE_COPY[locale].audio.title),
  'common.videoNode': CANVAS_LOCALES.map((locale) => DEFAULT_NODE_COPY[locale].video.title),
  'common.untitledNode': CANVAS_LOCALES.map(
    (locale) => DEFAULT_NODE_COPY[locale].untitledNode
  ),
  'common.untitledCanvas': CANVAS_LOCALES.map(
    (locale) => DEFAULT_NODE_COPY[locale].untitledCanvas
  ),
  'common.untitledCanvasNumber': CANVAS_LOCALES.map(
    (locale) => DEFAULT_NODE_COPY[locale].untitledCanvasNumber
  ),
} as const;

const CANVAS_RUNTIME_MESSAGE_LOOKUP: Record<string, string> = {
  '文本节点不支持直接接入视频输入。': 'runtime.textNodeNoVideo',
  '文本节点不支持直接接入音频输入。': 'runtime.textNodeNoAudio',
  '图片节点不支持直接接入视频输入。': 'runtime.imageNodeNoVideo',
  '图片节点不支持直接接入音频输入。': 'runtime.imageNodeNoAudio',
  '音频节点目前只支持文本上下文输入。': 'runtime.audioNodeTextOnly',
  '音频节点不支持直接接入音频输入。': 'runtime.audioNodeNoAudio',
  '需要填写提示词，或至少连接一个文本上下文。': 'runtime.promptRequired',
  '当前只有 Seedance 2 Stable 和 Ark 系列视频模型支持音频输入。':
    'runtime.seedanceAudioOnly',
  '使用音频输入时，至少还需要连接一张图片或一个视频参考。':
    'runtime.audioNeedsImageOrVideo',
  '首帧模式必须且只能连接 1 张参考图。':
    'runtime.seedanceFirstFrameImageCount',
  '首尾帧模式需要连接 1 到 2 张参考图。':
    'runtime.seedanceFirstLastImageCount',
  '首帧和首尾帧模式不支持音频或视频参考。':
    'runtime.seedanceFrameModeMediaUnsupported',
  'Midjourney 的图生图模式至少需要一个“图片提示”参考。':
    'runtime.midjourneyNeedsImagePrompt',
  '未找到对应的画布节点。': 'runtime.nodeNotFound',
  '画布当前存在版本冲突，请先加载最新版本。':
    'runtime.conflictLoadLatest',
  '没有可应用的连线变更。': 'runtime.noEdgeChanges',
  '没有可应用的节点变更。': 'runtime.noNodeChanges',
  '画布连线信息不完整。': 'runtime.connectionInfoIncomplete',
  '画布连线必须连接两侧端点：左到右或右到左。':
    'runtime.connectionMustConnectSides',
  '这条画布连线已存在。': 'runtime.edgeAlreadyExists',
  '画布中不允许出现循环连线。': 'runtime.noCycles',
  '风格参考和全向参考目前只接受图片节点。':
    'runtime.styleReferenceImagesOnly',
  '视频输出目前只能连接到视频节点。': 'runtime.videoOutputVideoOnly',
  '音频输出目前只能连接到视频节点。': 'runtime.audioOutputVideoOnly',
  '音频节点目前只接受文本输入。': 'runtime.audioTargetTextOnly',
  '暂不支持从视频直接连接到图片节点。': 'runtime.videoToImageUnsupported',
  '当前不支持这种连接方式。': 'runtime.connectionUnsupported',
  '读取视频时长失败。': 'runtime.readVideoDurationFailed',
  '加载视频元数据失败。': 'runtime.loadVideoMetadataFailed',
  '图片上传失败。': 'runtime.imageUploadFailed',
  '视频上传失败。': 'runtime.videoUploadFailed',
  '不支持的图片格式。': 'runtime.unsupportedImageFormat',
  '所选图片为空。': 'runtime.emptyImage',
  '图片大小超过 10MB 限制。': 'runtime.imageTooLarge',
  '不支持的视频格式，请上传 MP4 或 MOV。': 'runtime.unsupportedVideoFormat',
  '所选视频为空。': 'runtime.emptyVideo',
  '视频大小超过 50MB 限制。': 'runtime.videoTooLarge',
  '画布媒体上传失败。': 'runtime.canvasMediaUploadFailed',
  '不支持的音频格式，请上传 MP3 或 WAV。':
    'runtime.audioFormatUnsupported',
  '画布音频上传失败。': 'runtime.canvasAudioUploadFailed',
  '保存画布图谱失败': 'runtime.saveCanvasGraphFailed',
  '重新加载画布失败': 'runtime.reloadCanvasFailed',
  '重命名画布失败': 'runtime.renameCanvasFailed',
  '生成失败': 'runtime.generateFailed',
  '其他标签页已经保存了更新版本。请先加载最新画布后再继续。':
    'runtime.latestSavedElsewhere',
};

function matchesKnownValue(value: string, candidates: readonly string[]) {
  return candidates.includes(value.trim());
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function canvasT(
  t: CanvasTranslator,
  key: string,
  values?: CanvasTranslationValues
): string {
  return t(key, values);
}

export function buildUntitledCanvasTitle(
  t: CanvasTranslator,
  index?: number | null
): string {
  if (typeof index === 'number' && Number.isFinite(index)) {
    return t('common.untitledCanvasNumber', {
      index: Math.max(1, Math.floor(index)),
    });
  }

  return t('common.untitledCanvas');
}

export function getCanvasNodeTypeLabel(
  t: CanvasTranslator,
  nodeType: CanvasNodeType
): string {
  if (nodeType === 'text') {
    return t('common.textNodeLabel');
  }
  if (nodeType === 'note') {
    return t('common.noteNodeLabel');
  }
  if (nodeType === 'image') {
    return t('common.imageNodeLabel');
  }
  if (nodeType === 'audio') {
    return t('common.audioNodeLabel');
  }
  return t('common.videoNodeLabel');
}

export function localizeCanvasTitle(
  t: CanvasTranslator,
  title: string
): string {
  const normalized = title.trim();
  if (!normalized) {
    return t('common.untitledCanvas');
  }

  if (matchesKnownValue(normalized, DEFAULT_NODE_TITLES['common.untitledCanvas'])) {
    return t('common.untitledCanvas');
  }

  for (const template of DEFAULT_NODE_TITLES['common.untitledCanvasNumber']) {
    const pattern = `^${escapeRegExp(template).replace('\\{index\\}', '(\\\\d+)')}$`;
    const match = normalized.match(new RegExp(pattern));
    if (match) {
      return buildUntitledCanvasTitle(t, Number(match[1]));
    }
  }

  return title;
}

export function localizeCanvasNodeTitle(
  t: CanvasTranslator,
  nodeType: CanvasNodeType,
  title: string
): string {
  const normalized = title.trim();
  if (!normalized) {
    return t('common.untitledNode');
  }

  const key =
    nodeType === 'text'
      ? 'common.textNode'
      : nodeType === 'note'
        ? 'common.noteNode'
        : nodeType === 'image'
          ? 'common.imageNode'
          : nodeType === 'audio'
            ? 'common.audioNode'
            : 'common.videoNode';

  if (matchesKnownValue(normalized, DEFAULT_NODE_TITLES[key])) {
    return t(key);
  }

  if (matchesKnownValue(normalized, DEFAULT_NODE_TITLES['common.untitledNode'])) {
    return t('common.untitledNode');
  }

  return title;
}

export function getCanvasSoundKeyLabel(
  t: CanvasTranslator,
  value: string
): string {
  return value.trim() === 'Any' ? t('common.any') : value;
}

export function translateCanvasRuntimeMessage(
  t: CanvasTranslator,
  message: string,
  fallbackKey?: string
): string {
  const normalized = message.trim();
  if (!normalized) {
    return fallbackKey ? t(fallbackKey) : normalized;
  }

  const directKey =
    CANVAS_RUNTIME_MESSAGE_LOOKUP[normalized] ||
    CANVAS_RUNTIME_MESSAGE_LOOKUP[normalized.replace(/[。.]$/, '')];

  if (directKey) {
    return t(directKey);
  }

  const maxNodesMatch = normalized.match(/^画布最多支持\s+(\d+)\s+个节点。?$/);
  if (maxNodesMatch) {
    return t('runtime.maxNodes', { count: maxNodesMatch[1] });
  }

  const maxEdgesMatch = normalized.match(/^画布最多支持\s+(\d+)\s+条连线。?$/);
  if (maxEdgesMatch) {
    return t('runtime.maxEdges', { count: maxEdgesMatch[1] });
  }

  return fallbackKey ? t(fallbackKey) : message;
}
