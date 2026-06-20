const DEFAULT_CYBERBARA_BASE_URL = 'https://cyberbara.com';
const DEFAULT_CYBERBARA_TEXT_BASE_URL = 'https://api.kie.ai';

function getCyberbaraHeaders(apiKey: string) {
  const normalizedApiKey = apiKey.trim();
  if (!normalizedApiKey) {
    throw new Error('Missing Cyberbara API key');
  }

  return {
    Authorization: `Bearer ${normalizedApiKey}`,
    'x-api-key': normalizedApiKey,
  };
}

function getCyberbaraBaseUrl(baseUrl: string) {
  const normalizedBaseUrl = baseUrl.trim() || DEFAULT_CYBERBARA_BASE_URL;

  try {
    return new URL(normalizedBaseUrl).toString().replace(/\/$/, '');
  } catch {
    throw new Error('Cyberbara base URL must be a valid URL');
  }
}

function parseCyberbaraError(payload: unknown, status: number) {
  if (payload && typeof payload === 'object' && 'error' in payload) {
    const error = payload.error;
    if (
      error &&
      typeof error === 'object' &&
      'message' in error &&
      typeof error.message === 'string'
    ) {
      return error.message;
    }
  }

  return `Cyberbara request failed with status ${status}`;
}

function extractCyberbaraText(payload: unknown) {
  const content = (
    payload as { choices?: Array<{ message?: { content?: unknown } }> }
  )?.choices?.[0]?.message?.content;

  if (typeof content === 'string') {
    return content.trim();
  }

  if (Array.isArray(content)) {
    return content
      .map((item) =>
        item && typeof item === 'object' && 'text' in item
          ? String((item as { text?: string }).text || '')
          : ''
      )
      .join('\n')
      .trim();
  }

  return '';
}

async function cyberbaraJsonRequest<T>({
  apiKey,
  baseUrl,
  path,
  method = 'GET',
  body,
}: {
  apiKey: string;
  baseUrl: string;
  path: string;
  method?: 'GET' | 'POST';
  body?: unknown;
}): Promise<T> {
  const response = await fetch(`${getCyberbaraBaseUrl(baseUrl)}${path}`, {
    method,
    headers: {
      ...getCyberbaraHeaders(apiKey),
      Accept: 'application/json',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(parseCyberbaraError(payload, response.status));
  }

  return payload as T;
}

function normalizeCyberbaraOptions({
  nodeType,
  prompt,
  inputJson,
  mediaUrl,
  mediaKind,
}: {
  nodeType: 'image' | 'video';
  prompt: string;
  inputJson: string;
  mediaUrl?: string | null;
  mediaKind?: 'image' | 'video' | null;
}) {
  const normalizedPrompt = prompt.trim();
  let options: Record<string, unknown> = {};

  if (inputJson.trim()) {
    try {
      const parsed = JSON.parse(inputJson) as Record<string, unknown>;
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error('Advanced input JSON must be an object');
      }
      options = parsed;
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : 'Invalid advanced input JSON'
      );
    }
  }

  const imageInput = Array.isArray(options.image_input)
    ? options.image_input.filter((item): item is string => typeof item === 'string')
    : [];
  const videoInput = Array.isArray(options.video_input)
    ? options.video_input.filter((item): item is string => typeof item === 'string')
    : [];

  if (mediaUrl) {
    if (nodeType === 'image' && mediaKind === 'image' && imageInput.length === 0) {
      options.image_input = [mediaUrl];
    }

    if (nodeType === 'video') {
      if (mediaKind === 'video' && videoInput.length === 0) {
        options.video_input = [mediaUrl];
      } else if (mediaKind === 'image' && imageInput.length === 0) {
        options.image_input = [mediaUrl];
      }
    }
  }

  const nextImageInput = Array.isArray(options.image_input)
    ? options.image_input.filter((item): item is string => typeof item === 'string')
    : [];
  const nextVideoInput = Array.isArray(options.video_input)
    ? options.video_input.filter((item): item is string => typeof item === 'string')
    : [];

  const scene =
    nodeType === 'image'
      ? nextImageInput.length > 0
        ? 'image-to-image'
        : 'text-to-image'
      : nextVideoInput.length > 0
        ? 'video-to-video'
        : nextImageInput.length > 0
          ? 'image-to-video'
          : 'text-to-video';

  return {
    prompt: normalizedPrompt,
    options,
    scene,
  };
}

function normalizeCyberbaraTaskOutput(task: {
  status?: string;
  media_type?: string;
  output?: {
    images?: unknown[];
    videos?: unknown[];
  };
}) {
  if (task.media_type === 'image') {
    const imageUrl = task.output?.images?.find(
      (item): item is string => typeof item === 'string'
    );
    return imageUrl || '';
  }

  const videoUrl = task.output?.videos?.find(
    (item): item is string => typeof item === 'string'
  );
  return videoUrl || '';
}

function mapCyberbaraTaskStatus(status: string | undefined) {
  if (status === 'success') {
    return 'success';
  }

  if (status === 'failed' || status === 'canceled') {
    return 'error';
  }

  return 'running';
}

export async function createCyberbaraGeneration({
  apiKey,
  baseUrl,
  nodeType,
  model,
  prompt,
  inputJson,
  mediaUrl,
  mediaKind,
}: {
  apiKey: string;
  baseUrl: string;
  nodeType: 'image' | 'video';
  model: string;
  prompt: string;
  inputJson: string;
  mediaUrl?: string | null;
  mediaKind?: 'image' | 'video' | null;
}) {
  const normalizedModel = model.trim();
  if (!normalizedModel) {
    throw new Error('Cyberbara image and video nodes require a model slug');
  }

  const { prompt: normalizedPrompt, options, scene } = normalizeCyberbaraOptions({
    nodeType,
    prompt,
    inputJson,
    mediaUrl,
    mediaKind,
  });

  if (!normalizedPrompt && Object.keys(options).length === 0) {
    throw new Error('Cyberbara node requires a prompt or advanced options');
  }

  const payload = await cyberbaraJsonRequest<{
    data: {
      task_id: string;
      status?: string;
      media_type?: string;
    };
  }>({
    apiKey,
    baseUrl,
    path:
      nodeType === 'image'
        ? '/api/v1/images/generations'
        : '/api/v1/videos/generations',
    method: 'POST',
    body: {
      model: normalizedModel,
      prompt: normalizedPrompt,
      scene,
      options,
    },
  });

  return {
    predictionId: payload.data.task_id,
    status: mapCyberbaraTaskStatus(payload.data.status),
    outputMediaUrl: '',
  };
}

export async function queryCyberbaraTask({
  apiKey,
  baseUrl,
  taskId,
}: {
  apiKey: string;
  baseUrl: string;
  taskId: string;
}) {
  const payload = await cyberbaraJsonRequest<{
    data: {
      task: {
        id: string;
        status?: string;
        media_type?: string;
        output?: {
          images?: unknown[];
          videos?: unknown[];
        };
      };
    };
  }>({
    apiKey,
    baseUrl,
    path: `/api/v1/tasks/${taskId}`,
  });

  const task = payload.data.task;
  return {
    predictionId: task.id,
    status: mapCyberbaraTaskStatus(task.status),
    outputMediaUrl:
      task.status === 'success' ? normalizeCyberbaraTaskOutput(task) : '',
  };
}

export async function uploadCyberbaraMedia({
  apiKey,
  baseUrl,
  mediaType,
  file,
}: {
  apiKey: string;
  baseUrl: string;
  mediaType: 'image' | 'video';
  file: File;
}) {
  const formData = new FormData();
  formData.set('file', file);

  const response = await fetch(
    `${getCyberbaraBaseUrl(baseUrl)}${
      mediaType === 'image' ? '/api/v1/uploads/images' : '/api/v1/uploads/videos'
    }`,
    {
      method: 'POST',
      headers: {
        ...getCyberbaraHeaders(apiKey),
      },
      body: formData,
    }
  );

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(parseCyberbaraError(payload, response.status));
  }

  const item =
    payload &&
    typeof payload === 'object' &&
    'data' in payload &&
    payload.data &&
    typeof payload.data === 'object' &&
    'files' in payload.data &&
    Array.isArray(payload.data.files)
      ? payload.data.files[0]
      : null;

  if (!item || typeof item !== 'object') {
    throw new Error('Cyberbara upload response did not include a file');
  }

  return {
    url: typeof item.url === 'string' ? item.url : '',
    key: typeof item.key === 'string' ? item.key : '',
    contentType:
      typeof item.content_type === 'string' ? item.content_type : String(file.type || ''),
    size: typeof item.size === 'number' ? item.size : file.size,
    deduped: Boolean(
      typeof item.deduped === 'boolean' ? item.deduped : false
    ),
  };
}

export async function runCyberbaraText({
  apiKey,
  model,
  prompt,
  contextText,
  imageUrls,
}: {
  apiKey: string;
  model: string;
  prompt: string;
  contextText: string[];
  imageUrls: string[];
}) {
  const normalizedApiKey = apiKey.trim();
  if (!normalizedApiKey) {
    throw new Error('Missing Cyberbara API key');
  }

  const normalizedModel = model.trim();
  if (!normalizedModel) {
    throw new Error('Text node requires a Cyberbara text model');
  }

  const normalizedPrompt = prompt.trim();
  if (!normalizedPrompt) {
    throw new Error('Text node requires a prompt');
  }

  const userMessage = [
    contextText.length > 0
      ? `Upstream context:\n${contextText.join('\n\n---\n\n')}`
      : '',
    normalizedPrompt,
  ]
    .filter(Boolean)
    .join('\n\n');

  const response = await fetch(
    `${DEFAULT_CYBERBARA_TEXT_BASE_URL}/${normalizedModel}/v1/chat/completions`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${normalizedApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: normalizedModel,
        stream: false,
        include_thoughts: false,
        reasoning_effort: 'medium',
        messages: [
          {
            role: 'system',
            content: [
              {
                type: 'text',
                text: 'You are a multimodal creative assistant. Return the final answer directly as plain text unless the user explicitly asks for formatting.',
              },
            ],
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: userMessage,
              },
              ...imageUrls.map((url) => ({
                type: 'image_url',
                image_url: { url },
              })),
            ],
          },
        ],
      }),
    }
  );

  const payload = await response.json().catch(() => null);
  const payloadCode =
    payload && typeof payload === 'object' && 'code' in payload
      ? (payload as { code?: number | string }).code
      : undefined;
  const payloadMessage =
    payload && typeof payload === 'object' && 'msg' in payload
      ? String((payload as { msg?: string }).msg || '')
      : '';

  if (
    !response.ok ||
    (typeof payloadCode === 'number' && payloadCode !== 200) ||
    (typeof payloadCode === 'string' &&
      payloadCode !== '' &&
      payloadCode !== '200' &&
      payloadCode !== '0')
  ) {
    if (payloadMessage.includes('Unauthorized')) {
      throw new Error(
        'This Cyberbara API key is not accepted by the Gemini 3 Flash text endpoint. Use OpenRouter for text nodes or provide a KIE-compatible key.'
      );
    }

    throw new Error(
      payloadMessage ||
        parseCyberbaraError(payload, response.status || 500)
    );
  }

  const text = extractCyberbaraText(payload);
  if (!text) {
    throw new Error('Cyberbara text endpoint returned an empty response');
  }

  return {
    text,
    payload,
  };
}
