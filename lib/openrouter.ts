const DEFAULT_OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';

function normalizeBaseUrl(baseUrl?: string) {
  const value = (baseUrl || '').trim();
  return value || DEFAULT_OPENROUTER_BASE_URL;
}

function extractText(payload: unknown): string {
  const content = (payload as { choices?: Array<{ message?: { content?: unknown } }> })
    ?.choices?.[0]?.message?.content;

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

export async function runOpenRouterText({
  apiKey,
  baseUrl,
  model,
  prompt,
  contextText,
}: {
  apiKey: string;
  baseUrl?: string;
  model: string;
  prompt: string;
  contextText: string[];
}) {
  const normalizedApiKey = apiKey.trim();
  if (!normalizedApiKey) {
    throw new Error('Missing OpenRouter API key');
  }

  const normalizedModel = model.trim();
  if (!normalizedModel) {
    throw new Error('Text node requires an OpenRouter model');
  }

  const normalizedPrompt = prompt.trim();
  if (!normalizedPrompt) {
    throw new Error('Text node requires a prompt');
  }

  const response = await fetch(`${normalizeBaseUrl(baseUrl)}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${normalizedApiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'http://localhost:3000',
      'X-Title': 'open-canvas',
    },
    body: JSON.stringify({
      model: normalizedModel,
      messages: [
        {
          role: 'system',
          content:
            'You help creators turn structured workflow context into direct, usable output.',
        },
        {
          role: 'user',
          content: [
            contextText.length > 0
              ? `Upstream context:\n${contextText.join('\n\n---\n\n')}`
              : '',
            normalizedPrompt,
          ]
            .filter(Boolean)
            .join('\n\n'),
        },
      ],
    }),
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      (payload as { error?: { message?: string } })?.error?.message ||
      `OpenRouter request failed with status ${response.status}`;
    throw new Error(message);
  }

  const text = extractText(payload);
  if (!text) {
    throw new Error('OpenRouter returned an empty response');
  }

  return {
    text,
    payload,
  };
}
