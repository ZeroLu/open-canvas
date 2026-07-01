import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { getCloudflareContext } from '@opennextjs/cloudflare';

import { readCanvasClientIdFromCookie } from '@/lib/canvas-client-id';
import {
  applyCanvasNodePatch,
  createEmptyCanvasGraph,
  normalizeCanvasGraph,
  summarizeCanvasGraph,
  type CanvasDocumentRecord,
  type CanvasDocumentSummary,
  type CanvasNodePatch,
  type CanvasNodeRunRecord,
  type CanvasRunStatus,
  type SerializedCanvasGraph,
} from '@/shared/lib/canvas/types';

type LocalCanvasDatabase = {
  version: 1;
  canvases: CanvasDocumentRecord[];
  runs: CanvasNodeRunRecord[];
};

type CanvasKvNamespace = {
  get<T = unknown>(
    key: string,
    options?: {
      type: 'json';
    }
  ): Promise<T | null>;
  put(key: string, value: string): Promise<void>;
};

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'open-canvas-db.json');
const FILE_PERSISTENCE_UNAVAILABLE =
  'File-backed canvas persistence is not available in this runtime.';
const CANVAS_CLIENT_ID_UNAVAILABLE =
  'Canvas storage identity is missing. Refresh the page and try again.';
const OPEN_CANVAS_KV_BINDING = 'OPEN_CANVAS_KV';

function nowIso() {
  return new Date().toISOString();
}

function createCanvasTitle() {
  return 'Untitled canvas';
}

function createCanvasDocument(title = createCanvasTitle()): CanvasDocumentRecord {
  const now = nowIso();
  const graph = createEmptyCanvasGraph();

  return {
    id: randomUUID(),
    title,
    status: 'active',
    revision: 1,
    preview: summarizeCanvasGraph(graph),
    lastOpenedAt: now,
    createdAt: now,
    updatedAt: now,
    graph,
  };
}

function createEmptyDb(): LocalCanvasDatabase {
  return {
    version: 1,
    canvases: [],
    runs: [],
  };
}

async function getCanvasStorage():
  Promise<
    | {
        type: 'kv';
        kv: CanvasKvNamespace;
        key: string;
      }
    | {
        type: 'file';
      }
    | {
        type: 'missing-client-id';
      }
  > {
  try {
    const context = await getCloudflareContext({ async: true });
    const env = context.env as Record<string, unknown>;
    const kv = env[OPEN_CANVAS_KV_BINDING] as CanvasKvNamespace | undefined;

    if (kv) {
      const clientId = await readCanvasClientIdFromCookie();

      if (!clientId) {
        return {
          type: 'missing-client-id',
        };
      }

      return {
        type: 'kv',
        kv,
        key: `canvas-db:${clientId}`,
      };
    }
  } catch {
    // Local Next.js development has no Cloudflare request context.
  }

  return {
    type: 'file',
  };
}

async function ensureDbFile() {
  try {
    await mkdir(DATA_DIR, { recursive: true });
    await readFile(DB_FILE, 'utf8');
  } catch (error) {
    if (isFileSystemUnavailableError(error)) {
      throw error;
    }

    await writeDb(createEmptyDb());
  }
}

async function readDb(): Promise<LocalCanvasDatabase> {
  const storage = await getCanvasStorage();

  if (storage.type === 'kv') {
    const parsed = await storage.kv.get<Partial<LocalCanvasDatabase>>(
      storage.key,
      {
        type: 'json',
      }
    );
    return normalizeDb(parsed);
  }

  if (storage.type === 'missing-client-id') {
    return createEmptyDb();
  }

  try {
    await ensureDbFile();
    const raw = await readFile(DB_FILE, 'utf8');
    const parsed = JSON.parse(raw) as Partial<LocalCanvasDatabase>;
    return normalizeDb(parsed);
  } catch {
    return createEmptyDb();
  }
}

async function writeDb(db: LocalCanvasDatabase) {
  const storage = await getCanvasStorage();

  if (storage.type === 'kv') {
    await storage.kv.put(storage.key, JSON.stringify(normalizeDb(db)));
    return;
  }

  if (storage.type === 'missing-client-id') {
    throw new Error(CANVAS_CLIENT_ID_UNAVAILABLE);
  }

  try {
    await mkdir(DATA_DIR, { recursive: true });
    const tempFile = `${DB_FILE}.${process.pid}.${Date.now()}.tmp`;
    await writeFile(tempFile, JSON.stringify(db, null, 2), 'utf8');
    await rename(tempFile, DB_FILE);
  } catch (error) {
    if (isFileSystemUnavailableError(error)) {
      throw new Error(FILE_PERSISTENCE_UNAVAILABLE);
    }

    throw error;
  }
}

async function updateDb<T>(updater: (db: LocalCanvasDatabase) => T | Promise<T>) {
  const db = await readDb();
  const result = await updater(db);
  await writeDb(db);
  return result;
}

function normalizeDb(
  parsed: Partial<LocalCanvasDatabase> | null | undefined
): LocalCanvasDatabase {
  const canvases = Array.isArray(parsed?.canvases)
    ? parsed.canvases.map((canvas) => {
        const graph = normalizeCanvasGraph(canvas.graph);
        return {
          ...canvas,
          graph,
          preview: summarizeCanvasGraph(graph),
        };
      })
    : [];

  return {
    version: 1,
    canvases,
    runs: Array.isArray(parsed?.runs) ? parsed.runs : [],
  };
}

function sortCanvases(canvases: CanvasDocumentSummary[]) {
  return [...canvases].sort((a, b) => {
    const left = new Date(b.updatedAt || b.createdAt || 0).getTime();
    const right = new Date(a.updatedAt || a.createdAt || 0).getTime();
    return left - right;
  });
}

function isFileSystemUnavailableError(error: unknown) {
  return (
    error instanceof Error &&
    (error.message.includes('not implemented') ||
      error.message.includes('operation is not supported'))
  );
}

export async function ensureLocalCanvasDocument() {
  return updateDb((db) => {
    if (db.canvases.length > 0) {
      return sortCanvases(db.canvases)[0] as CanvasDocumentRecord;
    }

    const canvas = createCanvasDocument();
    db.canvases.push(canvas);
    return canvas;
  });
}

export async function listLocalCanvasDocuments() {
  const db = await readDb();
  return sortCanvases(db.canvases);
}

export async function createLocalCanvasDocument(title?: string) {
  return updateDb((db) => {
    const canvas = createCanvasDocument(title?.trim() || createCanvasTitle());
    db.canvases.unshift(canvas);
    return canvas;
  });
}

export async function findLocalCanvasDocumentById(id: string) {
  const db = await readDb();
  return db.canvases.find((item) => item.id === id) || null;
}

export async function touchLocalCanvasDocumentOpenedAt(id: string) {
  return updateDb((db) => {
    const canvas = db.canvases.find((item) => item.id === id) || null;
    if (!canvas) {
      return null;
    }

    canvas.lastOpenedAt = nowIso();
    return canvas;
  });
}

export async function renameLocalCanvasDocument(id: string, title: string) {
  return updateDb((db) => {
    const canvas = db.canvases.find((item) => item.id === id) || null;
    if (!canvas) {
      return null;
    }

    canvas.title = title.trim();
    canvas.updatedAt = nowIso();
    return canvas;
  });
}

export async function deleteLocalCanvasDocument(id: string) {
  return updateDb((db) => {
    const nextCanvases = db.canvases.filter((item) => item.id !== id);
    const deleted = nextCanvases.length !== db.canvases.length;
    if (!deleted) {
      return false;
    }

    db.canvases = nextCanvases;
    db.runs = db.runs.filter((item) => item.canvasId !== id);
    if (db.canvases.length === 0) {
      db.canvases.push(createCanvasDocument());
    }
    return true;
  });
}

export async function updateLocalCanvasDocumentGraph({
  id,
  revision,
  graph,
}: {
  id: string;
  revision: number;
  graph: SerializedCanvasGraph;
}) {
  return updateDb((db) => {
    const canvas = db.canvases.find((item) => item.id === id) || null;
    if (!canvas) {
      return null;
    }

    if (canvas.revision !== revision) {
      return {
        ok: false as const,
        canvas,
      };
    }

    const nextUpdatedAt = nowIso();
    canvas.graph = graph;
    canvas.preview = summarizeCanvasGraph(graph);
    canvas.revision += 1;
    canvas.updatedAt = nextUpdatedAt;

    return {
      ok: true as const,
      canvas,
    };
  });
}

export async function applyLocalCanvasNodePatch({
  canvasId,
  patch,
}: {
  canvasId: string;
  patch: CanvasNodePatch;
}) {
  return updateDb((db) => {
    const canvas = db.canvases.find((item) => item.id === canvasId) || null;
    if (!canvas) {
      return null;
    }

    const nextGraph = applyCanvasNodePatch(canvas.graph, patch);
    if (!nextGraph) {
      return null;
    }

    canvas.graph = nextGraph;
    canvas.preview = summarizeCanvasGraph(nextGraph);
    canvas.revision += 1;
    canvas.updatedAt = nowIso();

    return canvas;
  });
}

export async function createLocalCanvasRun(
  run: Omit<CanvasNodeRunRecord, 'id' | 'createdAt' | 'updatedAt'>
) {
  return updateDb((db) => {
    const now = nowIso();
    const nextRun: CanvasNodeRunRecord = {
      ...run,
      id: randomUUID(),
      createdAt: now,
      updatedAt: now,
    };
    db.runs.unshift(nextRun);
    return nextRun;
  });
}

export async function findLocalCanvasRun({
  canvasId,
  runId,
}: {
  canvasId: string;
  runId: string;
}) {
  const db = await readDb();
  return db.runs.find((item) => item.canvasId === canvasId && item.id === runId) || null;
}

export async function updateLocalCanvasRun({
  canvasId,
  runId,
  status,
  aiTaskId,
  responsePayload,
  outputAsset,
  errorCode,
  errorMessage,
  finishedAt,
  costCredits,
}: {
  canvasId: string;
  runId: string;
  status?: CanvasRunStatus;
  aiTaskId?: string | null;
  responsePayload?: Record<string, unknown> | null;
  outputAsset?: CanvasNodeRunRecord['outputAsset'];
  errorCode?: string | null;
  errorMessage?: string | null;
  finishedAt?: string | null;
  costCredits?: number;
}) {
  return updateDb((db) => {
    const run =
      db.runs.find((item) => item.canvasId === canvasId && item.id === runId) || null;
    if (!run) {
      return null;
    }

    if (status) {
      run.status = status;
    }
    if (aiTaskId !== undefined) {
      run.aiTaskId = aiTaskId;
    }
    if (responsePayload !== undefined) {
      run.responsePayload = responsePayload;
    }
    if (outputAsset !== undefined) {
      run.outputAsset = outputAsset;
    }
    if (errorCode !== undefined) {
      run.errorCode = errorCode;
    }
    if (errorMessage !== undefined) {
      run.errorMessage = errorMessage;
    }
    if (finishedAt !== undefined) {
      run.finishedAt = finishedAt;
    }
    if (costCredits !== undefined) {
      run.costCredits = costCredits;
    }
    run.updatedAt = nowIso();
    return run;
  });
}
