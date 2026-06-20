import { NextResponse } from 'next/server';
import { z } from 'zod';

import {
  createCyberbaraGeneration,
  queryCyberbaraTask,
  runCyberbaraText,
} from '@/lib/cyberbara';
import { runOpenRouterText } from '@/lib/openrouter';
import {
  createReplicatePrediction,
  queryReplicatePrediction,
} from '@/lib/replicate';

const executeSchema = z.object({
  nodeType: z.enum(['text', 'image', 'video']),
  provider: z.enum(['openrouter', 'replicate', 'cyberbara']),
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
    cyberbaraApiKey: z.string().default(''),
    cyberbaraBaseUrl: z.string().default(''),
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
      if (input.provider === 'cyberbara') {
        if (input.mediaKind === 'video') {
          throw new Error('Cyberbara text nodes do not accept video input.');
        }

        const result = await runCyberbaraText({
          apiKey: input.settings.cyberbaraApiKey,
          model: input.model,
          prompt: input.prompt,
          contextText: input.contextText,
          imageUrls:
            input.mediaKind === 'image' && input.mediaUrl ? [input.mediaUrl] : [],
        });

        return NextResponse.json({
          ok: true,
          status: 'success',
          outputText: result.text,
        });
      }

      if (input.provider !== 'openrouter') {
        throw new Error('Text nodes support OpenRouter or Cyberbara.');
      }

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

    if (input.predictionId && input.provider === 'replicate') {
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

    if (input.predictionId && input.provider === 'cyberbara') {
      const result = await queryCyberbaraTask({
        apiKey: input.settings.cyberbaraApiKey,
        baseUrl: input.settings.cyberbaraBaseUrl,
        taskId: input.predictionId,
      });

      return NextResponse.json({
        ok: true,
        status: result.status,
        predictionId: result.predictionId,
        outputMediaUrl: result.outputMediaUrl,
      });
    }

    const prompt = [...input.contextText, input.prompt]
      .map((value) => value.trim())
      .filter(Boolean)
      .join('\n\n');

    if (input.provider === 'cyberbara') {
      const result = await createCyberbaraGeneration({
        apiKey: input.settings.cyberbaraApiKey,
        baseUrl: input.settings.cyberbaraBaseUrl,
        nodeType: input.nodeType,
        model: input.model,
        prompt,
        inputJson: input.inputJson,
        mediaUrl: input.mediaUrl,
        mediaKind: input.mediaKind,
      });

      return NextResponse.json({
        ok: true,
        status: result.status,
        predictionId: result.predictionId,
        outputMediaUrl: result.outputMediaUrl,
      });
    }

    if (input.provider !== 'replicate') {
      throw new Error('Only Replicate or Cyberbara can run image and video nodes.');
    }

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
