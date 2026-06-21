import { AIMediaType, AITaskStatus } from '@/extensions/ai/types';
import type { AICreditScene } from '@/shared/lib/ai-credit-rules';
import {
  shouldSendCanvasVideoAspectRatio,
  shouldSendCanvasVideoDuration,
  shouldSendCanvasVideoResolution,
} from '@/shared/lib/canvas/model-options';
import {
  CanvasAudioNodeData,
  CanvasExecutionScene,
  CanvasImageNodeData,
  CanvasNodeData,
  CanvasNodeStatus,
  CanvasNodeType,
  CanvasNoteNodeData,
  CanvasRunStatus,
  CanvasTextNodeData,
  CanvasTextScene,
  CanvasVideoNodeData,
  getCanvasNodeById,
  normalizeCanvasNodeData,
  SerializedCanvasGraph,
} from '@/shared/lib/canvas/types';
import { resolvePublicModelRoute } from '@/shared/services/public-ai-models';

export interface ResolvedCanvasNodeInputs {
  textInputs: Array<{
    nodeId: string;
    text: string;
  }>;
  imageInputs: Array<{
    nodeId: string;
    url: string;
  }>;
  styleReferenceInputs: Array<{
    nodeId: string;
    url: string;
  }>;
  omniReferenceInputs: Array<{
    nodeId: string;
    url: string;
  }>;
  videoInputs: Array<{
    nodeId: string;
    url: string;
    durationSec?: number;
  }>;
  audioInputs: Array<{
    nodeId: string;
    url: string;
    durationSec?: number;
  }>;
}

type CanvasExecutionBuildErrorCode =
  | 'node_not_found'
  | 'unsupported_input_type'
  | 'prompt_required'
  | 'invalid_model'
  | 'scene_not_supported'
  | 'invalid_scene';

type CanvasExecutionBuildError = {
  ok: false;
  code: CanvasExecutionBuildErrorCode;
  message: string;
};

export type CanvasMediaTaskDescriptor = {
  kind: 'media';
  mediaType: AIMediaType.IMAGE | AIMediaType.VIDEO | AIMediaType.AUDIO;
  publicModel: string;
  provider: string;
  model: string;
  scene: AICreditScene;
  prompt: string;
  options: Record<string, unknown>;
  inputs: ResolvedCanvasNodeInputs;
};

function isMidjourneyCanvasImageModel(model: string): boolean {
  return model === 'midjourney-v7';
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

function isGeminiOmniCanvasVideoModel(model: string): boolean {
  return model === 'gemini-omni-video';
}

function isSeedanceCanvasReferenceModeModel(model: string): boolean {
  return isArkCanvasVideoModel(model) || isKieSeedanceCanvasVideoModel(model);
}

function normalizeCanvasImageHandle(
  handle?: string
): 'left' | 'style' | 'omni' {
  if (handle === 'style-reference') {
    return 'style';
  }

  if (handle === 'omni-reference') {
    return 'omni';
  }

  return 'left';
}

export type CanvasTextTaskDescriptor = {
  kind: 'text';
  model: string;
  scene: CanvasTextScene;
  prompt: string;
  userMessage: string;
  inputs: ResolvedCanvasNodeInputs;
};

function collectTextContext(inputs: ResolvedCanvasNodeInputs): string {
  return inputs.textInputs
    .map((item, index) => `[Text ${index + 1}] ${item.text}`)
    .join('\n\n');
}

export function getCanvasNodeOutputText(
  nodeData: CanvasNodeData
): string | null {
  if (nodeData.nodeType === 'note') {
    const value = nodeData.noteHtml
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    return value ? value : null;
  }

  if (nodeData.nodeType !== 'text') {
    return null;
  }

  const value = nodeData.plainText.trim();
  return value ? value : null;
}

export function getCanvasNodeOutputImage(
  nodeData: CanvasNodeData
): string | null {
  if (nodeData.nodeType !== 'image') {
    return null;
  }

  return nodeData.image?.url?.trim() || null;
}

export function getCanvasNodeOutputVideo(nodeData: CanvasNodeData): {
  url: string;
  durationSec?: number;
} | null {
  if (nodeData.nodeType !== 'video' || !nodeData.video?.url?.trim()) {
    return null;
  }

  return {
    url: nodeData.video.url.trim(),
    durationSec: nodeData.video.durationSec || undefined,
  };
}

export function getCanvasNodeOutputAudio(nodeData: CanvasNodeData): {
  url: string;
  durationSec?: number;
} | null {
  if (nodeData.nodeType !== 'audio' || !nodeData.audio?.url?.trim()) {
    return null;
  }

  return {
    url: nodeData.audio.url.trim(),
    durationSec: nodeData.audio.durationSec || undefined,
  };
}

export function resolveCanvasNodeInputs(
  graph: SerializedCanvasGraph,
  nodeId: string
): ResolvedCanvasNodeInputs {
  const incomingEdges = graph.edges.filter((edge) => edge.target === nodeId);
  const targetNode = getCanvasNodeById(graph, nodeId);
  const targetNodeData = targetNode
    ? normalizeCanvasNodeData(targetNode.type, targetNode.data)
    : null;
  const usesMidjourneyInputSemantics =
    targetNodeData?.nodeType === 'image' &&
    isMidjourneyCanvasImageModel(targetNodeData.model);
  const textInputs: ResolvedCanvasNodeInputs['textInputs'] = [];
  const imageInputs: ResolvedCanvasNodeInputs['imageInputs'] = [];
  const styleReferenceInputs: ResolvedCanvasNodeInputs['styleReferenceInputs'] =
    [];
  const omniReferenceInputs: ResolvedCanvasNodeInputs['omniReferenceInputs'] =
    [];
  const videoInputs: ResolvedCanvasNodeInputs['videoInputs'] = [];
  const audioInputs: ResolvedCanvasNodeInputs['audioInputs'] = [];

  for (const edge of incomingEdges) {
    const sourceNode = getCanvasNodeById(graph, edge.source);
    if (!sourceNode) {
      continue;
    }

    const sourceData = normalizeCanvasNodeData(
      sourceNode.type,
      sourceNode.data
    );
    const textValue = getCanvasNodeOutputText(sourceData);
    const imageValue = getCanvasNodeOutputImage(sourceData);
    const videoValue = getCanvasNodeOutputVideo(sourceData);
    const audioValue = getCanvasNodeOutputAudio(sourceData);

    if (textValue) {
      textInputs.push({
        nodeId: sourceNode.id,
        text: textValue,
      });
    }

    if (imageValue) {
      const normalizedHandle = normalizeCanvasImageHandle(edge.targetHandle);

      if (usesMidjourneyInputSemantics && normalizedHandle === 'style') {
        styleReferenceInputs.push({
          nodeId: sourceNode.id,
          url: imageValue,
        });
      } else if (usesMidjourneyInputSemantics && normalizedHandle === 'omni') {
        omniReferenceInputs.push({
          nodeId: sourceNode.id,
          url: imageValue,
        });
      } else {
        imageInputs.push({
          nodeId: sourceNode.id,
          url: imageValue,
        });
      }
    }

    if (videoValue) {
      videoInputs.push({
        nodeId: sourceNode.id,
        url: videoValue.url,
        durationSec: videoValue.durationSec,
      });
    }

    if (audioValue) {
      audioInputs.push({
        nodeId: sourceNode.id,
        url: audioValue.url,
        durationSec: audioValue.durationSec,
      });
    }
  }

  return {
    textInputs,
    imageInputs,
    styleReferenceInputs,
    omniReferenceInputs,
    videoInputs,
    audioInputs,
  };
}

export function inferCanvasExecutionScene(
  nodeType: CanvasNodeType,
  inputs: ResolvedCanvasNodeInputs,
  nodeData?: CanvasNodeData
): CanvasExecutionScene {
  if (nodeType === 'text') {
    return inputs.imageInputs.length > 0 ? 'image-to-text' : 'text-to-text';
  }

  if (nodeType === 'note') {
    return 'text-to-text';
  }

  if (nodeType === 'image') {
    if (nodeData?.nodeType === 'image' && nodeData.sceneMode !== 'auto') {
      return nodeData.sceneMode;
    }

    return inputs.imageInputs.length > 0 ? 'image-to-image' : 'text-to-image';
  }

  if (nodeType === 'audio') {
    return 'text-to-audio';
  }

  if (inputs.videoInputs.length > 0) {
    return 'video-to-video';
  }

  return inputs.imageInputs.length > 0 ? 'image-to-video' : 'text-to-video';
}

export function getCanvasUnsupportedInputMessage(
  nodeType: CanvasNodeType,
  inputs: ResolvedCanvasNodeInputs
): string | null {
  if (nodeType === 'text' && inputs.videoInputs.length > 0) {
    return '文本节点不支持直接接入视频输入。';
  }

  if (nodeType === 'text' && inputs.audioInputs.length > 0) {
    return '文本节点不支持直接接入音频输入。';
  }

  if (nodeType === 'image' && inputs.videoInputs.length > 0) {
    return '图片节点不支持直接接入视频输入。';
  }

  if (nodeType === 'image' && inputs.audioInputs.length > 0) {
    return '图片节点不支持直接接入音频输入。';
  }

  if (nodeType === 'audio') {
    if (inputs.imageInputs.length > 0 || inputs.videoInputs.length > 0) {
      return '音频节点目前只支持文本上下文输入。';
    }
    if (inputs.audioInputs.length > 0) {
      return '音频节点不支持直接接入音频输入。';
    }
  }

  return null;
}

export function composeCanvasPrompt({
  prompt,
  inputs,
}: {
  prompt: string;
  inputs: ResolvedCanvasNodeInputs;
}): string {
  const trimmedPrompt = prompt.trim();
  const textContext = collectTextContext(inputs);

  if (trimmedPrompt && textContext) {
    return `Context from connected text nodes:\n${textContext}\n\nUser request:\n${trimmedPrompt}`;
  }

  return trimmedPrompt || textContext;
}

export function buildCanvasTextUserMessage({
  prompt,
  inputs,
}: {
  prompt: string;
  inputs: ResolvedCanvasNodeInputs;
}): string {
  const sections: string[] = [];
  const textContext = collectTextContext(inputs);

  if (textContext) {
    sections.push(`Connected text context:\n${textContext}`);
  }

  if (prompt.trim()) {
    sections.push(`Instruction:\n${prompt.trim()}`);
  } else if (textContext) {
    sections.push(
      'Use the connected text context as the primary material and respond directly.'
    );
  }

  if (inputs.imageInputs.length > 0) {
    sections.push(
      'Use the attached image references when they are relevant to the instruction.'
    );
  }

  return sections.join('\n\n').trim();
}

export function buildCanvasTextTaskDescriptor(
  nodeData: CanvasTextNodeData | CanvasNoteNodeData,
  inputs: ResolvedCanvasNodeInputs
): CanvasTextTaskDescriptor | CanvasExecutionBuildError {
  if (nodeData.nodeType === 'note') {
    return {
      ok: false,
      code: 'invalid_scene',
      message: 'Note 节点仅用于说明，不支持执行。',
    };
  }

  const unsupportedMessage = getCanvasUnsupportedInputMessage(
    nodeData.nodeType,
    inputs
  );
  if (unsupportedMessage) {
    return {
      ok: false,
      code: 'unsupported_input_type',
      message: unsupportedMessage,
    };
  }

  const prompt = composeCanvasPrompt({
    prompt: nodeData.prompt,
    inputs,
  });
  if (!prompt) {
    return {
      ok: false,
      code: 'prompt_required',
      message: '需要填写提示词，或至少连接一个文本上下文。',
    };
  }

  const scene = inferCanvasExecutionScene(
    nodeData.nodeType,
    inputs,
    nodeData
  ) as CanvasTextScene;

  return {
    kind: 'text',
    model: nodeData.model,
    scene,
    prompt,
    userMessage: buildCanvasTextUserMessage({
      prompt: nodeData.prompt,
      inputs,
    }),
    inputs,
  };
}

export function buildCanvasMediaTaskDescriptor(
  nodeData: CanvasImageNodeData | CanvasVideoNodeData | CanvasAudioNodeData,
  inputs: ResolvedCanvasNodeInputs
): CanvasMediaTaskDescriptor | CanvasExecutionBuildError {
  const unsupportedMessage = getCanvasUnsupportedInputMessage(
    nodeData.nodeType,
    inputs
  );
  if (unsupportedMessage) {
    return {
      ok: false,
      code: 'unsupported_input_type',
      message: unsupportedMessage,
    };
  }

  const prompt = composeCanvasPrompt({
    prompt: nodeData.prompt,
    inputs,
  });
  if (!prompt) {
    return {
      ok: false,
      code: 'prompt_required',
      message: '需要填写提示词，或至少连接一个文本上下文。',
    };
  }

  const mediaType =
    nodeData.nodeType === 'image'
      ? AIMediaType.IMAGE
      : nodeData.nodeType === 'audio'
        ? AIMediaType.AUDIO
        : AIMediaType.VIDEO;
  const scene = inferCanvasExecutionScene(
    nodeData.nodeType,
    inputs,
    nodeData
  ) as AICreditScene;
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
            aspect_ratio: shouldSendCanvasVideoAspectRatio(
              nodeData.model,
              scene
            )
              ? nodeData.aspectRatio
              : undefined,
            resolution: shouldSendCanvasVideoResolution(nodeData.model, scene)
              ? nodeData.resolution
              : undefined,
            duration: shouldSendCanvasVideoDuration(nodeData.model, scene)
              ? nodeData.duration
              : undefined,
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

  if (
    nodeData.nodeType === 'video' &&
    isGeminiOmniCanvasVideoModel(nodeData.model) &&
    scene === 'video-to-video'
  ) {
    const primaryVideoDuration = inputs.videoInputs[0]?.durationSec;
    if (
      typeof primaryVideoDuration === 'number' &&
      Number.isFinite(primaryVideoDuration) &&
      primaryVideoDuration > 0
    ) {
      options.input_video_duration = Number(
        Math.min(primaryVideoDuration, 10).toFixed(2)
      );
    }
  }

  if (!Array.isArray(options.image_input) || options.image_input.length === 0) {
    delete options.image_input;
  }
  if (typeof options.aspect_ratio !== 'string') {
    delete options.aspect_ratio;
  }
  if (typeof options.resolution !== 'string') {
    delete options.resolution;
  }
  if (typeof options.duration !== 'string') {
    delete options.duration;
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
    } else if (
      nodeData.nodeType === 'video' &&
      nodeData.model !== 'seedance-2-stable' &&
      nodeData.model !== 'seedance-2-fast-stable' &&
      nodeData.model !== 'seedance-2-ark' &&
      nodeData.model !== 'seedance-2-fast-ark' &&
      nodeData.model !== 'seedance-2-mini-ark'
    ) {
      return {
        ok: false,
        code: 'unsupported_input_type',
        message: '当前只有 Seedance 2 Stable 和 Ark 系列视频模型支持音频输入。',
      };
    } else if (
      nodeData.nodeType === 'video' &&
      inputs.imageInputs.length === 0 &&
      inputs.videoInputs.length === 0
    ) {
      return {
        ok: false,
        code: 'unsupported_input_type',
        message: '使用音频输入时，至少还需要连接一张图片或一个视频参考。',
      };
    }
  }

  if (
    nodeData.nodeType === 'video' &&
    isGeminiOmniCanvasVideoModel(nodeData.model)
  ) {
    if (scene === 'image-to-video' && inputs.imageInputs.length > 7) {
      return {
        ok: false,
        code: 'unsupported_input_type',
        message: 'Gemini Omni Video 最多支持 7 张参考图。',
      };
    }

    if (scene === 'video-to-video') {
      if (inputs.videoInputs.length !== 1) {
        return {
          ok: false,
          code: 'unsupported_input_type',
          message:
            'Gemini Omni Video 的视频编辑模式必须且只能连接 1 个视频输入。',
        };
      }

      if (inputs.imageInputs.length > 5) {
        return {
          ok: false,
          code: 'unsupported_input_type',
          message: 'Gemini Omni Video 的视频编辑模式最多支持 5 张参考图。',
        };
      }

      const videoDuration = inputs.videoInputs[0]?.durationSec;
      if (
        typeof videoDuration === 'number' &&
        Number.isFinite(videoDuration) &&
        videoDuration > 10
      ) {
        return {
          ok: false,
          code: 'unsupported_input_type',
          message: 'Gemini Omni Video 的输入视频需在 10 秒以内。',
        };
      }
    }
  }

  if (
    nodeData.nodeType === 'video' &&
    isSeedanceCanvasReferenceModeModel(nodeData.model) &&
    scene === 'image-to-video'
  ) {
    if (
      nodeData.referenceMode === 'first_frame' &&
      inputs.imageInputs.length !== 1
    ) {
      return {
        ok: false,
        code: 'unsupported_input_type',
        message: '首帧模式必须且只能连接 1 张参考图。',
      };
    }

    if (
      nodeData.referenceMode === 'first_last_frames' &&
      (inputs.imageInputs.length < 1 || inputs.imageInputs.length > 2)
    ) {
      return {
        ok: false,
        code: 'unsupported_input_type',
        message: '首尾帧模式需要连接 1 到 2 张参考图。',
      };
    }

    if (
      (nodeData.referenceMode === 'first_frame' ||
        nodeData.referenceMode === 'first_last_frames') &&
      (inputs.videoInputs.length > 0 || inputs.audioInputs.length > 0)
    ) {
      return {
        ok: false,
        code: 'unsupported_input_type',
        message: '首帧和首尾帧模式不支持音频或视频参考。',
      };
    }
  }

  if (
    nodeData.nodeType === 'image' &&
    isMidjourneyCanvasImageModel(nodeData.model) &&
    scene === 'image-to-image' &&
    !Array.isArray(options.image_input)
  ) {
    return {
      ok: false,
      code: 'unsupported_input_type',
      message: 'Midjourney 的图生图模式至少需要一个“图片提示”参考。',
    };
  }

  const route = resolvePublicModelRoute({
    publicModel: nodeData.model,
    mediaType,
    scene,
    options,
  });
  if (!route.ok) {
    return {
      ok: false,
      code:
        route.code === 'invalid_model'
          ? 'invalid_model'
          : route.code === 'scene_not_supported'
            ? 'scene_not_supported'
            : 'invalid_scene',
      message: route.message,
    };
  }

  return {
    kind: 'media',
    mediaType,
    publicModel: route.publicModel,
    provider: route.provider,
    model: route.model,
    scene: route.scene,
    prompt,
    options: route.options,
    inputs,
  };
}

export function buildCanvasNodeTaskDescriptor(
  graph: SerializedCanvasGraph,
  nodeId: string
):
  | CanvasTextTaskDescriptor
  | CanvasMediaTaskDescriptor
  | CanvasExecutionBuildError {
  const node = getCanvasNodeById(graph, nodeId);
  if (!node) {
    return {
      ok: false,
      code: 'node_not_found',
      message: '未找到对应的画布节点。',
    };
  }

  const nodeData = normalizeCanvasNodeData(node.type, node.data);
  const inputs = resolveCanvasNodeInputs(graph, nodeId);

  if (nodeData.nodeType === 'text' || nodeData.nodeType === 'note') {
    return buildCanvasTextTaskDescriptor(nodeData, inputs);
  }

  return buildCanvasMediaTaskDescriptor(nodeData, inputs);
}

export function mapAITaskStatusToCanvasRunStatus(
  status: string
): CanvasRunStatus {
  if (status === AITaskStatus.SUCCESS) {
    return 'success';
  }

  if (status === AITaskStatus.FAILED) {
    return 'failed';
  }

  if (status === AITaskStatus.CANCELED) {
    return 'canceled';
  }

  return status === AITaskStatus.PROCESSING ? 'running' : 'pending';
}

export function mapCanvasRunStatusToNodeStatus(
  status: CanvasRunStatus
): CanvasNodeStatus {
  if (status === 'success') {
    return 'success';
  }

  if (status === 'failed' || status === 'canceled') {
    return 'error';
  }

  return status === 'running' ? 'running' : 'queued';
}

export function isFinalCanvasRunStatus(status: CanvasRunStatus): boolean {
  return status === 'success' || status === 'failed' || status === 'canceled';
}
