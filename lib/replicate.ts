function getReplicateHeaders(apiToken: string) {
  const normalizedApiToken = apiToken.trim();
  if (!normalizedApiToken) {
    throw new Error('Missing Replicate API token');
  }

  return {
    Authorization: `Token ${normalizedApiToken}`,
    'Content-Type': 'application/json',
    Prefer: 'wait',
  };
}

function normalizeReplicateInput({
  prompt,
  inputJson,
  mediaUrl,
  mediaKind,
}: {
  prompt: string;
  inputJson: string;
  mediaUrl?: string | null;
  mediaKind?: 'image' | 'video' | null;
}) {
  const normalizedPrompt = prompt.trim();
  if (!normalizedPrompt) {
    throw new Error('Replicate node requires a prompt');
  }

  let parsedInput: Record<string, unknown> = {};
  if (inputJson.trim()) {
    try {
      const parsed = JSON.parse(inputJson) as Record<string, unknown>;
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error('Advanced input JSON must be an object');
      }
      parsedInput = parsed;
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : 'Invalid advanced input JSON'
      );
    }
  }

  if (parsedInput.prompt === undefined) {
    parsedInput.prompt = normalizedPrompt;
  }

  if (mediaUrl) {
    const inputMediaKeys = [
      'image',
      'input_image',
      'start_image',
      'first_frame_image',
      'input_video',
    ];
    const hasMediaKey = inputMediaKeys.some((key) => parsedInput[key] !== undefined);

    if (!hasMediaKey) {
      if (mediaKind === 'video') {
        parsedInput.input_video = mediaUrl;
      } else {
        parsedInput.image = mediaUrl;
      }
    }
  }

  return parsedInput;
}

function normalizeReplicateOutput(prediction: {
  output?: unknown;
  status?: string;
  error?: string | null;
  id: string;
}) {
  if (prediction.status === 'failed') {
    throw new Error(prediction.error || 'Replicate prediction failed');
  }

  if (prediction.status === 'canceled') {
    throw new Error('Replicate prediction was canceled');
  }

  const output = prediction.output;
  if (typeof output === 'string') {
    return output;
  }

  if (Array.isArray(output)) {
    const firstUrl = output.find((item) => typeof item === 'string');
    if (typeof firstUrl === 'string') {
      return firstUrl;
    }
  }

  return '';
}

export async function createReplicatePrediction({
  apiToken,
  model,
  prompt,
  inputJson,
  mediaUrl,
  mediaKind,
}: {
  apiToken: string;
  model: string;
  prompt: string;
  inputJson: string;
  mediaUrl?: string | null;
  mediaKind?: 'image' | 'video' | null;
}) {
  const normalizedModel = model.trim();
  if (!normalizedModel) {
    throw new Error('Image and video nodes require a Replicate model slug');
  }

  const input = normalizeReplicateInput({
    prompt,
    inputJson,
    mediaUrl,
    mediaKind,
  });

  const response = await fetch('https://api.replicate.com/v1/predictions', {
    method: 'POST',
    headers: getReplicateHeaders(apiToken),
    body: JSON.stringify({
      model: normalizedModel,
      input,
    }),
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      (payload as { detail?: string; error?: string })?.detail ||
      (payload as { error?: string })?.error ||
      `Replicate request failed with status ${response.status}`;
    throw new Error(message);
  }

  const prediction = payload as {
    id: string;
    status?: string;
    output?: unknown;
    error?: string | null;
  };

  return {
    predictionId: prediction.id,
    status: prediction.status || 'starting',
    outputMediaUrl:
      prediction.status === 'succeeded' ? normalizeReplicateOutput(prediction) : '',
  };
}

export async function queryReplicatePrediction({
  apiToken,
  predictionId,
}: {
  apiToken: string;
  predictionId: string;
}) {
  const response = await fetch(
    `https://api.replicate.com/v1/predictions/${predictionId}`,
    {
      headers: getReplicateHeaders(apiToken),
    }
  );

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      (payload as { detail?: string; error?: string })?.detail ||
      (payload as { error?: string })?.error ||
      `Replicate query failed with status ${response.status}`;
    throw new Error(message);
  }

  const prediction = payload as {
    id: string;
    status?: string;
    output?: unknown;
    error?: string | null;
  };

  return {
    predictionId: prediction.id,
    status: prediction.status || 'starting',
    outputMediaUrl:
      prediction.status === 'succeeded' ? normalizeReplicateOutput(prediction) : '',
    errorMessage:
      prediction.status === 'failed' ? prediction.error || 'Replicate prediction failed' : '',
  };
}
