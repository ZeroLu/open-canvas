import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

import {
  applyCanvasNodePatch,
  createEmptyCanvasGraph,
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

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'open-canvas-db.json');

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

async function ensureDbFile() {
  await mkdir(DATA_DIR, { recursive: true });
  try {
    await readFile(DB_FILE, 'utf8');
  } catch {
    await writeDb(createEmptyDb());
  }
}

async function readDb(): Promise<LocalCanvasDatabase> {
  await ensureDbFile();
  try {
    const raw = await readFile(DB_FILE, 'utf8');
    const parsed = JSON.parse(raw) as Partial<LocalCanvasDatabase>;
    return {
      version: 1,
      canvases: Array.isArray(parsed.canvases) ? parsed.canvases : [],
      runs: Array.isArray(parsed.runs) ? parsed.runs : [],
    };
  } catch {
    return createEmptyDb();
  }
}

async function writeDb(db: LocalCanvasDatabase) {
  await mkdir(DATA_DIR, { recursive: true });
  const tempFile = `${DB_FILE}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(tempFile, JSON.stringify(db, null, 2), 'utf8');
  await rename(tempFile, DB_FILE);
}

async function updateDb<T>(updater: (db: LocalCanvasDatabase) => T | Promise<T>) {
  const db = await readDb();
  const result = await updater(db);
  await writeDb(db);
  return result;
}

function sortCanvases(canvases: CanvasDocumentSummary[]) {
  return [...canvases].sort((a, b) => {
    const left = new Date(b.updatedAt || b.createdAt || 0).getTime();
    const right = new Date(a.updatedAt || a.createdAt || 0).getTime();
    return left - right;
  });
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
