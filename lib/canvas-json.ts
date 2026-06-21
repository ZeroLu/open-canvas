'use client';

import type { StoredCanvasState, WorkflowNodeData } from '@/lib/types';
import {
  createDefaultCanvasNodeData,
  normalizeCanvasGraph,
  type CanvasDocumentRecord,
  type CanvasNodeData,
  type CanvasNodeMedia,
  type CanvasNodeType,
  type SerializedCanvasGraph,
  type SerializedCanvasNode,
} from '@/shared/lib/canvas/types';

type ExportPayload = {
  format: 'open-canvas-document-v1';
  exportedAt: string;
  title: string;
  graph: SerializedCanvasGraph;
};

function slugifyCanvasTitle(title: string) {
  return (
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'open-canvas'
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function buildMedia(url: string): CanvasNodeMedia {
  return {
    url,
    source: 'generated',
  };
}

function mapLegacyNodeData(nodeType: CanvasNodeType, data: WorkflowNodeData): CanvasNodeData {
  const status =
    data.status === 'running' ||
    data.status === 'success' ||
    data.status === 'error'
      ? data.status
      : 'idle';

  if (nodeType === 'note') {
    const defaults = createDefaultCanvasNodeData('note');
    return {
      ...defaults,
      noteHtml: String(data.note || ''),
      title: String(data.title || defaults.title),
      model: String(data.model || defaults.model),
      prompt: String(data.prompt || ''),
      status,
      errorMessage: data.error || null,
      lastRunId: data.predictionId || null,
      lastCompletedAt: data.updatedAt || null,
    };
  }

  if (nodeType === 'text') {
    const defaults = createDefaultCanvasNodeData('text');
    return {
      ...defaults,
      plainText: String(data.outputText || ''),
      title: String(data.title || defaults.title),
      model: String(data.model || defaults.model),
      prompt: String(data.prompt || ''),
      status,
      errorMessage: data.error || null,
      lastRunId: data.predictionId || null,
      lastCompletedAt: data.updatedAt || null,
    };
  }

  if (nodeType === 'image') {
    const defaults = createDefaultCanvasNodeData('image');
    const media = data.outputMediaUrl ? buildMedia(String(data.outputMediaUrl)) : null;
    return {
      ...defaults,
      image: media,
      imageOutputs: media ? [media] : [],
      selectedImageIndex: 0,
      inputMode: 'generate',
      sceneMode: 'auto',
      imageWeight: '',
      styleReferenceWeight: '',
      omniReferenceWeight: '',
      title: String(data.title || defaults.title),
      model: String(data.model || defaults.model),
      prompt: String(data.prompt || ''),
      status,
      errorMessage: data.error || null,
      lastRunId: data.predictionId || null,
      lastCompletedAt: data.updatedAt || null,
    };
  }

  if (nodeType === 'video') {
    const defaults = createDefaultCanvasNodeData('video');
    const media = data.outputMediaUrl ? buildMedia(String(data.outputMediaUrl)) : null;
    return {
      ...defaults,
      video: media,
      videoHistory: media ? [media] : [],
      selectedVideoIndex: 0,
      inputMode: 'generate',
      referenceMode: 'auto',
      title: String(data.title || defaults.title),
      model: String(data.model || defaults.model),
      prompt: String(data.prompt || ''),
      status,
      errorMessage: data.error || null,
      lastRunId: data.predictionId || null,
      lastCompletedAt: data.updatedAt || null,
    };
  }

  return createDefaultCanvasNodeData('audio');
}

function parseLegacyCanvasState(
  value: StoredCanvasState,
  fallbackTitle: string
): { title: string; graph: SerializedCanvasGraph } {
  const nodes: SerializedCanvasNode[] = Array.isArray(value.nodes)
    ? value.nodes.map((node) => {
        const rawData = node.data as WorkflowNodeData;
        const nodeType = rawData.kind as CanvasNodeType;
        return {
          id: node.id,
          type: nodeType,
          position: node.position,
          data: mapLegacyNodeData(nodeType, rawData),
        };
      })
    : [];

  const graph = normalizeCanvasGraph({
    version: 1,
    viewport: value.viewport,
    nodes,
    edges: Array.isArray(value.edges)
      ? value.edges.map((edge) => ({
          id: edge.id,
          source: edge.source,
          target: edge.target,
          type: 'default',
        }))
      : [],
  });

  return {
    title: value.name?.trim() || fallbackTitle,
    graph,
  };
}

function parseCanvasImportPayload(
  value: unknown,
  fallbackTitle: string
): { title: string; graph: SerializedCanvasGraph } {
  if (!isRecord(value)) {
    throw new Error('Canvas JSON must be an object.');
  }

  if (value.format === 'open-canvas-document-v1' && value.graph) {
    return {
      title:
        typeof value.title === 'string' && value.title.trim()
          ? value.title.trim()
          : fallbackTitle,
      graph: normalizeCanvasGraph(value.graph as Partial<SerializedCanvasGraph>),
    };
  }

  if (value.graph && isRecord(value.graph)) {
    const title =
      typeof value.title === 'string' && value.title.trim()
        ? value.title.trim()
        : fallbackTitle;

    return {
      title,
      graph: normalizeCanvasGraph(value.graph as Partial<SerializedCanvasGraph>),
    };
  }

  if (
    Array.isArray(value.nodes) &&
    Array.isArray(value.edges) &&
    isRecord(value.viewport)
  ) {
    const maybeLegacy = value as Partial<StoredCanvasState>;
    const firstNode = maybeLegacy.nodes?.[0];
    if (
      firstNode &&
      isRecord(firstNode) &&
      isRecord(firstNode.data) &&
      typeof firstNode.data.kind === 'string'
    ) {
      return parseLegacyCanvasState(value as unknown as StoredCanvasState, fallbackTitle);
    }

    return {
      title:
        typeof value.title === 'string' && value.title.trim()
          ? value.title.trim()
          : fallbackTitle,
      graph: normalizeCanvasGraph(value as Partial<SerializedCanvasGraph>),
    };
  }

  throw new Error('Unrecognized canvas JSON format.');
}

function buildExportPayload(canvas: CanvasDocumentRecord): ExportPayload {
  return {
    format: 'open-canvas-document-v1',
    exportedAt: new Date().toISOString(),
    title: canvas.title,
    graph: canvas.graph,
  };
}

export async function exportCanvasToJson(canvasId: string) {
  const response = await fetch(`/api/canvas/${canvasId}`);
  const json = await response.json();

  if (!response.ok || json.code !== 0 || !json.data?.canvas) {
    throw new Error(json.message || 'Failed to load canvas for export');
  }

  const canvas = json.data.canvas as CanvasDocumentRecord;
  const payload = buildExportPayload(canvas);
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${slugifyCanvasTitle(canvas.title)}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function importCanvasFromJsonFile(file: File) {
  const raw = await file.text();
  const parsed = JSON.parse(raw) as unknown;
  const fallbackTitle =
    file.name.replace(/\.json$/i, '').trim() || 'Imported canvas';
  const payload = parseCanvasImportPayload(parsed, fallbackTitle);

  const createResponse = await fetch('/api/canvas', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title: payload.title,
    }),
  });
  const createJson = await createResponse.json();
  if (!createResponse.ok || createJson.code !== 0 || !createJson.data?.canvas) {
    throw new Error(createJson.message || 'Failed to create canvas from JSON');
  }

  const canvas = createJson.data.canvas as CanvasDocumentRecord;
  const saveResponse = await fetch(`/api/canvas/${canvas.id}/graph`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      revision: canvas.revision,
      graph: payload.graph,
    }),
  });
  const saveJson = await saveResponse.json();
  if (!saveResponse.ok || saveJson.code !== 0) {
    throw new Error(saveJson.message || 'Failed to save imported canvas graph');
  }

  return {
    canvasId: canvas.id,
    title: payload.title,
  };
}
