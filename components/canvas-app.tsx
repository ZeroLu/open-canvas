'use client';
/* eslint-disable @next/next/no-img-element */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from 'react';
import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  Background,
  Controls,
  MarkerType,
  MiniMap,
  ReactFlow,
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
  type NodeProps,
  type NodeTypes,
  type Viewport,
} from '@xyflow/react';
import {
  Download,
  FileImage,
  FileText,
  LoaderCircle,
  NotebookPen,
  Play,
  RotateCcw,
  Save,
  Settings2,
  Trash2,
  Upload,
  Video,
} from 'lucide-react';

import '@xyflow/react/dist/style.css';

import {
  DEFAULT_PROVIDER_SETTINGS,
  normalizeProviderSettings,
  providerSettingsToErrorMap,
  validateProviderSettings,
} from '@/lib/provider-settings';
import type {
  ProviderSettings,
  StoredCanvasState,
  WorkflowNodeData,
  WorkflowNodeType,
} from '@/lib/types';

const STORAGE_KEY = 'open-canvas/v1';

type RuntimeNodeData = WorkflowNodeData & {
  onRun: (id: string) => void;
};

type FlowNode = Node<RuntimeNodeData, 'workflow'>;
type StoredNode = Node<WorkflowNodeData, 'workflow'>;
type StoredEdge = Edge;

const DEFAULT_VIEWPORT: Viewport = { x: 0, y: 0, zoom: 1 };

const NODE_META: Record<
  WorkflowNodeType,
  {
    label: string;
    icon: typeof NotebookPen;
    borderClass: string;
    provider: WorkflowNodeData['provider'];
  }
> = {
  note: {
    label: 'Note',
    icon: NotebookPen,
    borderClass: 'border-zinc-700',
    provider: 'openrouter',
  },
  text: {
    label: 'Text',
    icon: FileText,
    borderClass: 'border-sky-500/60',
    provider: 'openrouter',
  },
  image: {
    label: 'Image',
    icon: FileImage,
    borderClass: 'border-emerald-500/60',
    provider: 'replicate',
  },
  video: {
    label: 'Video',
    icon: Video,
    borderClass: 'border-violet-500/60',
    provider: 'replicate',
  },
};

function createNode(
  kind: WorkflowNodeType,
  position: { x: number; y: number },
  index: number
): StoredNode {
  const meta = NODE_META[kind];
  const exampleTitle = `${meta.label} ${index}`;

  return {
    id: `node-${Date.now()}-${index}`,
    type: 'workflow',
    position,
    data: {
      title: exampleTitle,
      kind,
      provider: meta.provider,
      model: '',
      prompt:
        kind === 'text'
          ? 'Turn the upstream brief into a production-ready prompt.'
          : kind === 'image'
            ? 'Generate the visual described above.'
            : kind === 'video'
              ? 'Turn the upstream concept into a short video shot.'
              : '',
      note:
        kind === 'note'
          ? 'Drop your creative brief here. Connect it into downstream text, image, or video nodes.'
          : '',
      inputJson: '',
      status: 'idle',
      error: null,
      outputText: '',
      outputMediaUrl: '',
      predictionId: null,
      updatedAt: null,
    },
  };
}

function serializeNodes(nodes: FlowNode[]): StoredNode[] {
  return nodes.map((node) => {
    const data = { ...node.data } as WorkflowNodeData;
    return {
      ...node,
      data,
    };
  });
}

function decorateNodes(
  nodes: StoredNode[],
  onRun: (id: string) => void
): FlowNode[] {
  return nodes.map((node) => ({
    ...node,
    data: {
      ...node.data,
      onRun,
    },
  }));
}

function formatTimestamp(value: string | null) {
  if (!value) {
    return 'Never';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Never';
  }

  return date.toLocaleString();
}

function getStatusTone(status: WorkflowNodeData['status']) {
  if (status === 'running') {
    return 'text-amber-300';
  }

  if (status === 'success') {
    return 'text-emerald-300';
  }

  if (status === 'error') {
    return 'text-rose-300';
  }

  return 'text-zinc-400';
}

function getFieldClass(hasError = false) {
  return `w-full rounded-lg border bg-black/30 px-3 py-2 text-sm outline-none placeholder:text-zinc-500 ${
    hasError
      ? 'border-rose-500/60 focus:border-rose-400'
      : 'border-white/10 focus:border-white/30'
  }`;
}

function WorkflowNodeCard({ data, selected, id }: NodeProps<FlowNode>) {
  const meta = NODE_META[data.kind];
  const Icon = meta.icon;

  return (
    <div
      className={`min-w-[240px] max-w-[280px] rounded-lg border bg-zinc-950/95 p-3 shadow-lg backdrop-blur ${meta.borderClass} ${
        selected ? 'ring-2 ring-white/70' : 'ring-1 ring-white/5'
      }`}
    >
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <Icon className="h-4 w-4" />
            <span className="truncate">{data.title}</span>
          </div>
          <div className="mt-1 text-xs text-zinc-400">
            {meta.label} · {data.provider}
          </div>
        </div>
        {data.kind !== 'note' ? (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              data.onRun(id);
            }}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-white/10 bg-white/5 text-white transition hover:bg-white/10"
            aria-label={`Run ${data.title}`}
          >
            {data.status === 'running' ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
          </button>
        ) : null}
      </div>

      <div className={`mb-2 text-xs font-medium ${getStatusTone(data.status)}`}>
        {data.status.toUpperCase()}
      </div>

      {data.kind === 'note' ? (
        <p className="line-clamp-5 text-sm text-zinc-200">{data.note || 'Empty note'}</p>
      ) : data.outputMediaUrl ? (
        <div className="overflow-hidden rounded-md border border-white/10 bg-black">
          {data.kind === 'video' ? (
            <video
              className="block aspect-video w-full object-cover"
              src={data.outputMediaUrl}
              controls
              muted
            />
          ) : (
            <img
              className="block aspect-square w-full object-cover"
              src={data.outputMediaUrl}
              alt={data.title}
            />
          )}
        </div>
      ) : (
        <p className="line-clamp-5 text-sm text-zinc-200">
          {data.outputText || data.prompt || 'No output yet'}
        </p>
      )}

      {data.error ? (
        <p className="mt-2 line-clamp-3 text-xs text-rose-300">{data.error}</p>
      ) : null}
    </div>
  );
}

const nodeTypes: NodeTypes = {
  workflow: WorkflowNodeCard,
};

export function CanvasApp() {
  const [nodes, setNodes] = useState<FlowNode[]>([]);
  const [edges, setEdges] = useState<StoredEdge[]>([]);
  const [viewport, setViewport] = useState<Viewport>(DEFAULT_VIEWPORT);
  const [settings, setSettings] = useState<ProviderSettings>(
    DEFAULT_PROVIDER_SETTINGS
  );
  const [settingsDraft, setSettingsDraft] = useState<ProviderSettings>(
    DEFAULT_PROVIDER_SETTINGS
  );
  const [settingsErrors, setSettingsErrors] = useState<
    Partial<Record<keyof ProviderSettings, string>>
  >({});
  const [settingsNotice, setSettingsNotice] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const mediaUploadInputRef = useRef<HTMLInputElement | null>(null);
  const pollingTimersRef = useRef<Map<string, number>>(new Map());
  const [uploadingNodeId, setUploadingNodeId] = useState<string | null>(null);

  const clearPolling = useCallback((nodeId: string) => {
    const timer = pollingTimersRef.current.get(nodeId);
    if (timer) {
      window.clearTimeout(timer);
      pollingTimersRef.current.delete(nodeId);
    }
  }, []);

  const updateNode = useCallback(
    (nodeId: string, updater: (node: FlowNode) => FlowNode) => {
      setNodes((current) =>
        current.map((node) => (node.id === nodeId ? updater(node) : node))
      );
    },
    []
  );

  const pollReplicateNode = useCallback(
    async (nodeId: string, predictionId: string) => {
      try {
        const node = serializeNodes(nodes).find((item) => item.id === nodeId);
        if (!node) {
          return;
        }

        const response = await fetch('/api/execute', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            nodeType: node.data.kind,
            model: node.data.model,
            prompt: node.data.prompt,
            inputJson: node.data.inputJson,
            predictionId,
            settings,
          }),
        });

        const payload = (await response.json()) as {
          ok: boolean;
          status?: WorkflowNodeData['status'];
          outputMediaUrl?: string;
          predictionId?: string;
          error?: string;
          errorMessage?: string;
        };

        if (!response.ok || !payload.ok) {
          throw new Error(payload.error || payload.errorMessage || 'Polling failed');
        }

        if (payload.status === 'running') {
          const nextTimer = window.setTimeout(() => {
            void pollReplicateNode(nodeId, predictionId);
          }, 3500);
          pollingTimersRef.current.set(nodeId, nextTimer);
          return;
        }

        clearPolling(nodeId);
        updateNode(nodeId, (currentNode) => ({
          ...currentNode,
          data: {
            ...currentNode.data,
            status: payload.status || 'success',
            error: payload.errorMessage || null,
            outputMediaUrl: payload.outputMediaUrl || '',
            predictionId: payload.status === 'running' ? predictionId : null,
            updatedAt: new Date().toISOString(),
          },
        }));
      } catch (error) {
        clearPolling(nodeId);
        updateNode(nodeId, (currentNode) => ({
          ...currentNode,
          data: {
            ...currentNode.data,
            status: 'error',
            error: error instanceof Error ? error.message : 'Polling failed',
            predictionId: null,
            updatedAt: new Date().toISOString(),
          },
        }));
      }
    },
    [clearPolling, nodes, settings, updateNode]
  );

  const runNode = useCallback(
    async (nodeId: string) => {
      const currentNodes = serializeNodes(nodes);
      const currentNode = currentNodes.find((node) => node.id === nodeId);
      if (!currentNode || currentNode.data.kind === 'note') {
        return;
      }

      const incoming = edges.filter((edge) => edge.target === nodeId);
      const upstreamNodes = incoming
        .map((edge) => currentNodes.find((node) => node.id === edge.source))
        .filter(Boolean) as StoredNode[];

      const contextText = upstreamNodes
        .map((node) => {
          if (node.data.kind === 'note') {
            return node.data.note;
          }

          return node.data.outputText || node.data.prompt;
        })
        .filter(Boolean);

      const upstreamMediaNode =
        upstreamNodes.find((node) => Boolean(node.data.outputMediaUrl)) || null;
      const mediaUrl =
        upstreamMediaNode?.data.outputMediaUrl ||
        ((currentNode.data.kind === 'image' || currentNode.data.kind === 'video') &&
        currentNode.data.outputMediaUrl
          ? currentNode.data.outputMediaUrl
          : null);
      const mediaKind =
        upstreamMediaNode?.data.kind === 'image' ||
        upstreamMediaNode?.data.kind === 'video'
          ? upstreamMediaNode.data.kind
          : currentNode.data.kind === 'image' || currentNode.data.kind === 'video'
            ? currentNode.data.kind
            : null;

      clearPolling(nodeId);
      updateNode(nodeId, (node) => ({
        ...node,
        data: {
          ...node.data,
          status: 'running',
          error: null,
          updatedAt: new Date().toISOString(),
        },
      }));

      try {
        const response = await fetch('/api/execute', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            nodeType: currentNode.data.kind,
            model: currentNode.data.model,
            prompt: currentNode.data.prompt,
            inputJson: currentNode.data.inputJson,
            contextText,
            mediaUrl,
            mediaKind,
            settings,
          }),
        });

        const payload = (await response.json()) as {
          ok: boolean;
          status?: WorkflowNodeData['status'];
          outputText?: string;
          outputMediaUrl?: string;
          predictionId?: string;
          error?: string;
        };

        if (!response.ok || !payload.ok) {
          throw new Error(payload.error || 'Execution failed');
        }

        updateNode(nodeId, (node) => ({
          ...node,
          data: {
            ...node.data,
            status: payload.status || 'success',
            error: null,
            outputText: payload.outputText || '',
            outputMediaUrl: payload.outputMediaUrl || '',
            predictionId: payload.predictionId || null,
            updatedAt: new Date().toISOString(),
          },
        }));

        if (payload.status === 'running' && payload.predictionId) {
          const timer = window.setTimeout(() => {
            void pollReplicateNode(nodeId, payload.predictionId!);
          }, 3500);
          pollingTimersRef.current.set(nodeId, timer);
        }
      } catch (error) {
        updateNode(nodeId, (node) => ({
          ...node,
          data: {
            ...node.data,
            status: 'error',
            error: error instanceof Error ? error.message : 'Execution failed',
            predictionId: null,
            updatedAt: new Date().toISOString(),
          },
        }));
      }
    },
    [clearPolling, edges, nodes, pollReplicateNode, settings, updateNode]
  );

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as StoredCanvasState;
        setNodes(decorateNodes(parsed.nodes as StoredNode[], runNode));
        setEdges(parsed.edges as StoredEdge[]);
        setViewport(parsed.viewport || DEFAULT_VIEWPORT);
        const normalizedSettings = normalizeProviderSettings(parsed.settings);
        setSettings(normalizedSettings);
        setSettingsDraft(normalizedSettings);
        setSelectedNodeId(parsed.nodes[0]?.id || null);
        setHydrated(true);
        return;
      }
    } catch (error) {
      console.error('Failed to hydrate local canvas state', error);
    }

    const starterNodes = decorateNodes(
      [
        createNode('note', { x: 80, y: 120 }, 1),
        createNode('text', { x: 420, y: 120 }, 2),
        createNode('image', { x: 780, y: 120 }, 3),
      ],
      runNode
    );
    const starterEdges: StoredEdge[] = [
      {
        id: 'edge-1',
        source: starterNodes[0].id,
        target: starterNodes[1].id,
        markerEnd: {
          type: MarkerType.ArrowClosed,
        },
      },
      {
        id: 'edge-2',
        source: starterNodes[1].id,
        target: starterNodes[2].id,
        markerEnd: {
          type: MarkerType.ArrowClosed,
        },
      },
    ];

    setNodes(starterNodes);
    setEdges(starterEdges);
    setSettings(DEFAULT_PROVIDER_SETTINGS);
    setSettingsDraft(DEFAULT_PROVIDER_SETTINGS);
    setSelectedNodeId(starterNodes[0]?.id || null);
    setHydrated(true);
  }, [runNode]);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    const payload: StoredCanvasState = {
      version: 1,
      nodes: serializeNodes(nodes).map((node) => ({
        id: node.id,
        position: node.position,
        data: node.data,
      })),
      edges: edges.map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
      })),
      viewport,
      settings,
    };

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }, [edges, hydrated, nodes, settings, viewport]);

  useEffect(() => {
    const timers = pollingTimersRef.current;
    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      timers.clear();
    };
  }, []);

  const selectedNode = useMemo(
    () => nodes.find((node) => node.id === selectedNodeId) || null,
    [nodes, selectedNodeId]
  );
  const storageUploadsEnabled = settings.storageProvider === 's3-compatible';

  const addNewNode = useCallback(
    (kind: WorkflowNodeType) => {
      const next = createNode(
        kind,
        { x: 120 + nodes.length * 40, y: 120 + nodes.length * 28 },
        nodes.length + 1
      );
      const decorated = decorateNodes([next], runNode)[0];
      setNodes((current) => [...current, decorated]);
      setSelectedNodeId(decorated.id);
    },
    [nodes.length, runNode]
  );

  const resetCanvas = useCallback(() => {
    pollingTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    pollingTimersRef.current.clear();
    window.localStorage.removeItem(STORAGE_KEY);
    window.location.reload();
  }, []);

  const exportCanvas = useCallback(() => {
    const payload: StoredCanvasState = {
      version: 1,
      nodes: serializeNodes(nodes).map((node) => ({
        id: node.id,
        position: node.position,
        data: node.data,
      })),
      edges: edges.map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
      })),
      viewport,
      settings,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'open-canvas.json';
    anchor.click();
    URL.revokeObjectURL(url);
  }, [edges, nodes, settings, viewport]);

  const importCanvas = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) {
        return;
      }

      const raw = await file.text();
      const parsed = JSON.parse(raw) as StoredCanvasState;
      setNodes(decorateNodes(parsed.nodes as StoredNode[], runNode));
      setEdges(parsed.edges as StoredEdge[]);
      setViewport(parsed.viewport || DEFAULT_VIEWPORT);
      const normalizedSettings = normalizeProviderSettings(parsed.settings);
      setSettings(normalizedSettings);
      setSettingsDraft(normalizedSettings);
      setSelectedNodeId(parsed.nodes[0]?.id || null);
      event.target.value = '';
    },
    [runNode]
  );

  const updateSelectedNodeData = useCallback(
    (patch: Partial<WorkflowNodeData>) => {
      if (!selectedNodeId) {
        return;
      }

      updateNode(selectedNodeId, (node) => ({
        ...node,
        data: {
          ...node.data,
          ...patch,
          updatedAt: new Date().toISOString(),
        },
      }));
    },
    [selectedNodeId, updateNode]
  );

  const saveProviderSettings = useCallback(() => {
    const normalized = normalizeProviderSettings(settingsDraft);
    const validation = validateProviderSettings(normalized);

    if (!validation.success) {
      setSettingsErrors(providerSettingsToErrorMap(normalized));
      setSettingsNotice('Fix the highlighted provider settings before saving.');
      return;
    }

    setSettings(normalized);
    setSettingsDraft(normalized);
    setSettingsErrors({});
    setSettingsNotice('Provider settings saved locally.');
  }, [settingsDraft]);

  const resetProviderSettings = useCallback(() => {
    setSettingsDraft(settings);
    setSettingsErrors({});
    setSettingsNotice('Reverted unsaved provider settings changes.');
  }, [settings]);

  const uploadMediaForSelectedNode = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      const selectedNodeSnapshot = selectedNode;
      if (
        !file ||
        !selectedNodeSnapshot ||
        (selectedNodeSnapshot.data.kind !== 'image' &&
          selectedNodeSnapshot.data.kind !== 'video')
      ) {
        event.target.value = '';
        return;
      }

      const uploadTarget =
        selectedNodeSnapshot.data.kind === 'image'
          ? '/api/uploads/images'
          : '/api/uploads/videos';

      setUploadingNodeId(selectedNodeSnapshot.id);
      updateNode(selectedNodeSnapshot.id, (node) => ({
        ...node,
        data: {
          ...node.data,
          status: 'running',
          error: null,
          updatedAt: new Date().toISOString(),
        },
      }));

      try {
        const formData = new FormData();
        formData.set('file', file);
        formData.set('storageProvider', settings.storageProvider);
        formData.set('storageS3Endpoint', settings.storageS3Endpoint);
        formData.set('storageS3Region', settings.storageS3Region);
        formData.set('storageS3AccessKeyId', settings.storageS3AccessKeyId);
        formData.set(
          'storageS3SecretAccessKey',
          settings.storageS3SecretAccessKey
        );
        formData.set('storageS3Bucket', settings.storageS3Bucket);
        formData.set('storageS3PublicDomain', settings.storageS3PublicDomain);
        formData.set('storageS3PathPrefix', settings.storageS3PathPrefix);

        const response = await fetch(uploadTarget, {
          method: 'POST',
          body: formData,
        });

        const payload = (await response.json()) as {
          ok: boolean;
          error?: string;
          media?: { url?: string };
        };

        if (!response.ok || !payload.ok || !payload.media?.url) {
          throw new Error(payload.error || 'Upload failed');
        }

        updateNode(selectedNodeSnapshot.id, (node) => ({
          ...node,
          data: {
            ...node.data,
            status: 'success',
            error: null,
            outputMediaUrl: payload.media?.url || '',
            outputText: '',
            predictionId: null,
            updatedAt: new Date().toISOString(),
          },
        }));
      } catch (error) {
        updateNode(selectedNodeSnapshot.id, (node) => ({
          ...node,
          data: {
            ...node.data,
            status: 'error',
            error: error instanceof Error ? error.message : 'Upload failed',
            updatedAt: new Date().toISOString(),
          },
        }));
      } finally {
        setUploadingNodeId(null);
        event.target.value = '';
      }
    },
    [selectedNode, settings, updateNode]
  );

  if (!hydrated) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0b0d10] text-zinc-300">
        <div className="flex items-center gap-3 text-sm">
          <LoaderCircle className="h-4 w-4 animate-spin" />
          Loading local canvas
        </div>
      </main>
    );
  }

  return (
    <main className="grid min-h-screen grid-cols-[320px_minmax(0,1fr)_360px] bg-[#0b0d10] text-zinc-100">
      <aside className="border-r border-white/10 bg-[#111318] p-4">
        <div className="mb-6">
          <div className="flex items-center gap-2 text-lg font-semibold text-white">
            <Settings2 className="h-5 w-5" />
            Open Canvas
          </div>
          <p className="mt-2 text-sm leading-6 text-zinc-400">
            Local-first workflow canvas. Keys stay in this browser. Documents live in
            local storage until you export them.
          </p>
        </div>

        <div className="space-y-3">
          <button
            type="button"
            onClick={() => addNewNode('note')}
            className="flex w-full items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white hover:bg-white/10"
          >
            <span>Add note node</span>
            <NotebookPen className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => addNewNode('text')}
            className="flex w-full items-center justify-between rounded-lg border border-sky-500/30 bg-sky-500/10 px-3 py-2 text-sm text-sky-100 hover:bg-sky-500/15"
          >
            <span>Add text node</span>
            <FileText className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => addNewNode('image')}
            className="flex w-full items-center justify-between rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100 hover:bg-emerald-500/15"
          >
            <span>Add image node</span>
            <FileImage className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => addNewNode('video')}
            className="flex w-full items-center justify-between rounded-lg border border-violet-500/30 bg-violet-500/10 px-3 py-2 text-sm text-violet-100 hover:bg-violet-500/15"
          >
            <span>Add video node</span>
            <Video className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-8 space-y-4">
          <div className="rounded-lg border border-white/10 bg-black/20 p-3">
            <div className="mb-3">
              <div className="text-sm font-semibold text-white">Provider settings</div>
              <p className="mt-1 text-xs leading-5 text-zinc-400">
                Saved locally in your browser. Execution and uploads use the last
                saved values.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                  OpenRouter
                </div>
                <div className="space-y-2">
                  <input
                    type="password"
                    value={settingsDraft.openrouterApiKey}
                    onChange={(event) =>
                      setSettingsDraft((current) => ({
                        ...current,
                        openrouterApiKey: event.target.value,
                      }))
                    }
                    placeholder="OpenRouter API key"
                    className={getFieldClass(Boolean(settingsErrors.openrouterApiKey))}
                  />
                  <input
                    value={settingsDraft.openrouterBaseUrl}
                    onChange={(event) =>
                      setSettingsDraft((current) => ({
                        ...current,
                        openrouterBaseUrl: event.target.value,
                      }))
                    }
                    placeholder="https://openrouter.ai/api/v1"
                    className={getFieldClass(Boolean(settingsErrors.openrouterBaseUrl))}
                  />
                  {settingsErrors.openrouterBaseUrl ? (
                    <p className="text-xs text-rose-300">
                      {settingsErrors.openrouterBaseUrl}
                    </p>
                  ) : null}
                </div>
              </div>

              <div>
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                  Replicate
                </div>
                <input
                  type="password"
                  value={settingsDraft.replicateApiToken}
                  onChange={(event) =>
                    setSettingsDraft((current) => ({
                      ...current,
                      replicateApiToken: event.target.value,
                    }))
                  }
                  placeholder="Replicate API token"
                  className={getFieldClass(Boolean(settingsErrors.replicateApiToken))}
                />
              </div>

              <div>
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                  Storage
                </div>
                <div className="space-y-2">
                  <select
                    value={settingsDraft.storageProvider}
                    onChange={(event) =>
                      setSettingsDraft((current) => ({
                        ...current,
                        storageProvider: event.target.value as ProviderSettings['storageProvider'],
                      }))
                    }
                    className={getFieldClass(Boolean(settingsErrors.storageProvider))}
                  >
                    <option value="disabled">Disabled</option>
                    <option value="s3-compatible">S3-compatible</option>
                  </select>

                  {settingsDraft.storageProvider === 's3-compatible' ? (
                    <div className="space-y-2">
                      <input
                        value={settingsDraft.storageS3Endpoint}
                        onChange={(event) =>
                          setSettingsDraft((current) => ({
                            ...current,
                            storageS3Endpoint: event.target.value,
                          }))
                        }
                        placeholder="S3 endpoint"
                        className={getFieldClass(Boolean(settingsErrors.storageS3Endpoint))}
                      />
                      {settingsErrors.storageS3Endpoint ? (
                        <p className="text-xs text-rose-300">
                          {settingsErrors.storageS3Endpoint}
                        </p>
                      ) : null}
                      <input
                        value={settingsDraft.storageS3Region}
                        onChange={(event) =>
                          setSettingsDraft((current) => ({
                            ...current,
                            storageS3Region: event.target.value,
                          }))
                        }
                        placeholder="Region"
                        className={getFieldClass(Boolean(settingsErrors.storageS3Region))}
                      />
                      <input
                        value={settingsDraft.storageS3Bucket}
                        onChange={(event) =>
                          setSettingsDraft((current) => ({
                            ...current,
                            storageS3Bucket: event.target.value,
                          }))
                        }
                        placeholder="Bucket"
                        className={getFieldClass(Boolean(settingsErrors.storageS3Bucket))}
                      />
                      {settingsErrors.storageS3Bucket ? (
                        <p className="text-xs text-rose-300">
                          {settingsErrors.storageS3Bucket}
                        </p>
                      ) : null}
                      <input
                        value={settingsDraft.storageS3AccessKeyId}
                        onChange={(event) =>
                          setSettingsDraft((current) => ({
                            ...current,
                            storageS3AccessKeyId: event.target.value,
                          }))
                        }
                        placeholder="Access key ID"
                        className={getFieldClass(Boolean(settingsErrors.storageS3AccessKeyId))}
                      />
                      {settingsErrors.storageS3AccessKeyId ? (
                        <p className="text-xs text-rose-300">
                          {settingsErrors.storageS3AccessKeyId}
                        </p>
                      ) : null}
                      <input
                        type="password"
                        value={settingsDraft.storageS3SecretAccessKey}
                        onChange={(event) =>
                          setSettingsDraft((current) => ({
                            ...current,
                            storageS3SecretAccessKey: event.target.value,
                          }))
                        }
                        placeholder="Secret access key"
                        className={getFieldClass(
                          Boolean(settingsErrors.storageS3SecretAccessKey)
                        )}
                      />
                      {settingsErrors.storageS3SecretAccessKey ? (
                        <p className="text-xs text-rose-300">
                          {settingsErrors.storageS3SecretAccessKey}
                        </p>
                      ) : null}
                      <input
                        value={settingsDraft.storageS3PublicDomain}
                        onChange={(event) =>
                          setSettingsDraft((current) => ({
                            ...current,
                            storageS3PublicDomain: event.target.value,
                          }))
                        }
                        placeholder="Public domain or CDN URL"
                        className={getFieldClass(Boolean(settingsErrors.storageS3PublicDomain))}
                      />
                      {settingsErrors.storageS3PublicDomain ? (
                        <p className="text-xs text-rose-300">
                          {settingsErrors.storageS3PublicDomain}
                        </p>
                      ) : null}
                      <input
                        value={settingsDraft.storageS3PathPrefix}
                        onChange={(event) =>
                          setSettingsDraft((current) => ({
                            ...current,
                            storageS3PathPrefix: event.target.value,
                          }))
                        }
                        placeholder="Path prefix"
                        className={getFieldClass(Boolean(settingsErrors.storageS3PathPrefix))}
                      />
                    </div>
                  ) : (
                    <p className="text-xs leading-5 text-zinc-500">
                      Keep storage disabled if you only want text and hosted media
                      generation. Enable S3-compatible storage to upload reference
                      images and videos.
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={saveProviderSettings}
                className="flex-1 rounded-lg border border-sky-500/30 bg-sky-500/10 px-3 py-2 text-sm text-sky-100 hover:bg-sky-500/15"
              >
                Save provider settings
              </button>
              <button
                type="button"
                onClick={resetProviderSettings}
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm hover:bg-white/10"
              >
                Reset
              </button>
            </div>

            {settingsNotice ? (
              <p className="mt-3 text-xs leading-5 text-zinc-400">{settingsNotice}</p>
            ) : null}
          </div>
        </div>

        <div className="mt-8 space-y-3">
          <button
            type="button"
            onClick={exportCanvas}
            className="flex w-full items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm hover:bg-white/10"
          >
            <span>Export canvas</span>
            <Download className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex w-full items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm hover:bg-white/10"
          >
            <span>Import canvas</span>
            <Upload className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={resetCanvas}
            className="flex w-full items-center justify-between rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-100 hover:bg-rose-500/15"
          >
            <span>Reset local state</span>
            <RotateCcw className="h-4 w-4" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={importCanvas}
          />
        </div>
      </aside>

      <section className="relative min-h-screen">
        <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between border-b border-white/10 bg-black/35 px-4 py-3 backdrop-blur">
          <div>
            <div className="text-sm font-semibold text-white">Workflow graph</div>
            <div className="text-xs text-zinc-400">
              Connect note, text, image, and video nodes. Upstream output is injected
              into downstream execution.
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <Save className="h-4 w-4" />
            Saved locally
          </div>
        </div>

        <div className="h-screen pt-[62px]">
          <ReactFlow<FlowNode, StoredEdge>
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            fitView
            defaultViewport={viewport}
            onNodeClick={(_, node) => setSelectedNodeId(node.id)}
            onNodesChange={(changes: NodeChange<FlowNode>[]) =>
              setNodes((current) => applyNodeChanges(changes, current))
            }
            onEdgesChange={(changes: EdgeChange[]) =>
              setEdges((current) => applyEdgeChanges(changes, current))
            }
            onConnect={(connection: Connection) =>
              setEdges((current) =>
                addEdge(
                  {
                    ...connection,
                    markerEnd: {
                      type: MarkerType.ArrowClosed,
                    },
                  },
                  current
                )
              )
            }
            onMoveEnd={(_, nextViewport) => setViewport(nextViewport)}
            colorMode="dark"
          >
            <MiniMap
              pannable
              zoomable
              nodeColor={(node) => {
                const kind = (node.data as RuntimeNodeData).kind;
                if (kind === 'text') {
                  return '#0ea5e9';
                }
                if (kind === 'image') {
                  return '#10b981';
                }
                if (kind === 'video') {
                  return '#8b5cf6';
                }
                return '#71717a';
              }}
              maskColor="rgba(11,13,16,0.65)"
            />
            <Controls />
            <Background color="#2a2e37" gap={24} size={1} />
          </ReactFlow>
        </div>
      </section>

      <aside className="border-l border-white/10 bg-[#111318] p-4">
        {selectedNode ? (
          <div className="space-y-5">
            <div>
              <div className="text-sm font-semibold text-white">Node editor</div>
              <div className="mt-1 text-xs text-zinc-400">
                Last updated: {formatTimestamp(selectedNode.data.updatedAt)}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-zinc-400">
                Title
              </label>
              <input
                value={selectedNode.data.title}
                onChange={(event) =>
                  updateSelectedNodeData({ title: event.target.value })
                }
                className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none placeholder:text-zinc-500 focus:border-white/30"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-zinc-400">
                Node type
              </label>
              <div className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-zinc-300">
                {NODE_META[selectedNode.data.kind].label}
              </div>
            </div>

            {selectedNode.data.kind === 'note' ? (
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-zinc-400">
                  Note
                </label>
                <textarea
                  value={selectedNode.data.note}
                  onChange={(event) =>
                    updateSelectedNodeData({ note: event.target.value })
                  }
                  rows={12}
                  className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-3 text-sm leading-6 outline-none placeholder:text-zinc-500 focus:border-white/30"
                />
              </div>
            ) : (
              <>
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-zinc-400">
                    Provider
                  </label>
                  <select
                    value={selectedNode.data.provider}
                    onChange={(event) =>
                      updateSelectedNodeData({
                        provider: event.target.value as WorkflowNodeData['provider'],
                      })
                    }
                    className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:border-white/30"
                  >
                    {selectedNode.data.kind === 'text' ? (
                      <option value="openrouter">OpenRouter</option>
                    ) : (
                      <option value="replicate">Replicate</option>
                    )}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-zinc-400">
                    Model
                  </label>
                  <input
                    value={selectedNode.data.model}
                    onChange={(event) =>
                      updateSelectedNodeData({ model: event.target.value })
                    }
                    placeholder={
                      selectedNode.data.kind === 'text'
                        ? 'openai/gpt-4o-mini or google/gemini-flash-*'
                        : 'black-forest-labs/flux-schnell'
                    }
                    className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none placeholder:text-zinc-500 focus:border-white/30"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-zinc-400">
                    Prompt
                  </label>
                  <textarea
                    value={selectedNode.data.prompt}
                    onChange={(event) =>
                      updateSelectedNodeData({ prompt: event.target.value })
                    }
                    rows={8}
                    className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-3 text-sm leading-6 outline-none placeholder:text-zinc-500 focus:border-white/30"
                  />
                </div>

                {(selectedNode.data.kind === 'image' ||
                  selectedNode.data.kind === 'video') && (
                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-zinc-400">
                      Advanced input JSON
                    </label>
                    <textarea
                      value={selectedNode.data.inputJson}
                      onChange={(event) =>
                        updateSelectedNodeData({ inputJson: event.target.value })
                      }
                      rows={8}
                      placeholder={`{\n  "aspect_ratio": "16:9"\n}`}
                      className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-3 font-mono text-sm leading-6 outline-none placeholder:text-zinc-500 focus:border-white/30"
                    />
                    <p className="mt-2 text-xs leading-5 text-zinc-500">
                      This is merged into Replicate input. If an upstream image or
                      video exists, the app injects it into a common media field when
                      you do not specify one yourself.
                    </p>
                  </div>
                )}

                {(selectedNode.data.kind === 'image' ||
                  selectedNode.data.kind === 'video') && (
                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-zinc-400">
                      Reference upload
                    </label>
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => mediaUploadInputRef.current?.click()}
                        disabled={!storageUploadsEnabled}
                        className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {uploadingNodeId === selectedNode.id ? (
                          <LoaderCircle className="h-4 w-4 animate-spin" />
                        ) : (
                          <Upload className="h-4 w-4" />
                        )}
                        Upload {selectedNode.data.kind}
                      </button>
                      {selectedNode.data.outputMediaUrl ? (
                        <button
                          type="button"
                          onClick={() =>
                            updateSelectedNodeData({
                              outputMediaUrl: '',
                              error: null,
                              predictionId: null,
                              status: 'idle',
                            })
                          }
                          className="flex items-center justify-center rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm hover:bg-white/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      ) : null}
                    </div>
                    <p className="mt-2 text-xs leading-5 text-zinc-500">
                      Upload a reference asset into this node. If there is no upstream
                      media connection, execution falls back to this uploaded file.
                    </p>
                    {!storageUploadsEnabled ? (
                      <p className="mt-2 text-xs leading-5 text-amber-300">
                        Save a valid S3-compatible storage provider first to enable
                        uploads.
                      </p>
                    ) : null}
                    <input
                      ref={mediaUploadInputRef}
                      type="file"
                      accept={
                        selectedNode.data.kind === 'image'
                          ? 'image/jpeg,image/jpg,image/png,image/webp,image/gif,image/avif,image/svg+xml,image/heic,image/heif'
                          : 'video/mp4,video/quicktime,video/webm'
                      }
                      className="hidden"
                      onChange={uploadMediaForSelectedNode}
                    />
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => void runNode(selectedNode.id)}
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100 hover:bg-emerald-500/15"
                  >
                    {selectedNode.data.status === 'running' ? (
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                    Run node
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      updateSelectedNodeData({
                        outputText: '',
                        outputMediaUrl: '',
                        error: null,
                        predictionId: null,
                        status: 'idle',
                      })
                    }
                    className="flex items-center justify-center rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm hover:bg-white/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                {selectedNode.data.error ? (
                  <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-100">
                    {selectedNode.data.error}
                  </div>
                ) : null}

                {selectedNode.data.outputText ? (
                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-zinc-400">
                      Output text
                    </label>
                    <div className="rounded-lg border border-white/10 bg-black/30 px-3 py-3 text-sm leading-6 text-zinc-100">
                      {selectedNode.data.outputText}
                    </div>
                  </div>
                ) : null}

                {selectedNode.data.outputMediaUrl ? (
                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-zinc-400">
                      Output media
                    </label>
                    <div className="overflow-hidden rounded-lg border border-white/10 bg-black">
                      {selectedNode.data.kind === 'video' ? (
                        <video
                          className="block aspect-video w-full object-cover"
                          src={selectedNode.data.outputMediaUrl}
                          controls
                        />
                      ) : (
                        <img
                          className="block aspect-square w-full object-cover"
                          src={selectedNode.data.outputMediaUrl}
                          alt={selectedNode.data.title}
                        />
                      )}
                    </div>
                  </div>
                ) : null}
              </>
            )}
          </div>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-zinc-500">
            Select a node to edit it
          </div>
        )}
      </aside>
    </main>
  );
}
