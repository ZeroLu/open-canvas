import { NextResponse } from 'next/server';
import { z } from 'zod';

import { runOpenRouterText } from '@/lib/openrouter';
import {
  createReplicatePrediction,
  queryReplicatePrediction,
} from '@/lib/replicate';

const executeSchema = z.object({
  nodeType: z.enum(['text', 'image', 'video']),
  model: z.string(),
  prompt: z.string(),
  inputJson: z.string().default(''),
  contextText: z.array(z.string()).default([]),
  mediaUrl: z.string().url().nullable().optional(),
  mediaKind: z.enum(['image', 'video']).nullable().optional(),
  predictionId: z.string().nullable().optional(),
  settings: z.object({
    openrouterApiKey: z.string().default(''),
    openrouterBaseUrl: z.string().default(''),
    replicateApiToken: z.string().default(''),
  }),
});

function mapReplicateStatus(status: string) {
  if (status === 'succeeded') {
    return 'success';
  }

  if (status === 'failed' || status === 'canceled') {
    return 'error';
  }

  return 'running';
}

export async function POST(request: Request) {
  try {
    const input = executeSchema.parse(await request.json());

    if (input.nodeType === 'text') {
      const result = await runOpenRouterText({
        apiKey: input.settings.openrouterApiKey,
        baseUrl: input.settings.openrouterBaseUrl,
        model: input.model,
        prompt: input.prompt,
        contextText: input.contextText,
      });

      return NextResponse.json({
        ok: true,
        status: 'success',
        outputText: result.text,
      });
    }

    if (input.predictionId) {
      const result = await queryReplicatePrediction({
        apiToken: input.settings.replicateApiToken,
        predictionId: input.predictionId,
      });

      return NextResponse.json({
        ok: true,
        status: mapReplicateStatus(result.status),
        predictionId: result.predictionId,
        outputMediaUrl: result.outputMediaUrl,
        errorMessage: result.errorMessage,
      });
    }

    const prompt = [...input.contextText, input.prompt]
      .map((value) => value.trim())
      .filter(Boolean)
      .join('\n\n');

    const result = await createReplicatePrediction({
      apiToken: input.settings.replicateApiToken,
      model: input.model,
      prompt,
      inputJson: input.inputJson,
      mediaUrl: input.mediaUrl,
      mediaKind: input.mediaKind,
    });

    return NextResponse.json({
      ok: true,
      status: mapReplicateStatus(result.status),
      predictionId: result.predictionId,
      outputMediaUrl: result.outputMediaUrl,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error ? error.message : 'Failed to execute workflow node',
      },
      { status: 400 }
    );
  }
}
