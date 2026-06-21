'use client';

import {
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
  type Edge,
  type EdgeChange,
  type NodeChange,
  type Viewport,
} from '@xyflow/react';
import { create } from 'zustand';

import {
  buildCanvasGraphFromFlow,
  createCanvasFlowNode,
  graphToFlowEdges,
  graphToFlowNodes,
  normalizeCanvasViewport,
  type CanvasFlowNode,
  type CanvasFlowNodeData,
} from '@/shared/lib/canvas/serialization';
import {
  applyCanvasNodePatch,
  applyCanvasNodePatchToData,
  CanvasDocumentRecord,
  CanvasNodePatch,
  CanvasNodeType,
  normalizeCanvasNodeData,
  parseCanvasGraph,
  SerializedCanvasGraph,
} from '@/shared/lib/canvas/types';
import {
  CANVAS_GRAPH_LIMITS,
  wouldCreateCanvasCycle,
} from '@/shared/lib/canvas/validation';

export type CanvasSaveStatus =
  | 'idle'
  | 'saving'
  | 'saved'
  | 'error'
  | 'conflict';

type CanvasMutationResult =
  | { ok: true }
  | {
      ok: false;
      code: 'invalid_graph' | 'graph_cycle_detected';
      message: string;
    };

type CanvasAddNodeResult =
  | { ok: true; nodeId: string }
  | {
      ok: false;
      code: 'invalid_graph' | 'graph_cycle_detected';
      message: string;
    };

export type CanvasClipboardNodeSnapshot = {
  id: string;
  type: CanvasNodeType;
  position: { x: number; y: number };
  data: CanvasFlowNodeData;
};

export type CanvasClipboardEdgeSnapshot = {
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
  type?: string | null;
  data?: Record<string, unknown>;
};

type CanvasStoreState = {
  canvasId: string | null;
  nodes: CanvasFlowNode[];
  edges: Edge[];
  viewport: Viewport;
  revision: number;
  savedGraphString: string;
  isHydrated: boolean;
  isDirty: boolean;
  saveStatus: CanvasSaveStatus;
  saveError: string | null;
  lastSavedAt: string | null;
  conflictDetected: boolean;
  hydrate: (canvas: CanvasDocumentRecord) => void;
  addNode: (
    nodeType: CanvasNodeType,
    position?: { x: number; y: number },
    locale?: string | null
  ) => CanvasAddNodeResult;
  duplicateNode: (nodeId: string) => CanvasAddNodeResult;
  pasteClipboard: ({
    nodes,
    edges,
    offset,
  }: {
    nodes: CanvasClipboardNodeSnapshot[];
    edges: CanvasClipboardEdgeSnapshot[];
    offset?: { x: number; y: number };
  }) => CanvasMutationResult;
  deleteNode: (nodeId: string) => void;
  deleteEdge: (edgeId: string) => void;
  updateEdgeTargetHandle: (
    edgeId: string,
    targetHandle: string
  ) => CanvasMutationResult;
  deleteIncomingReference: (targetNodeId: string, sourceNodeId: string) => void;
  deleteSelection: () => void;
  onNodesChange: (changes: NodeChange<CanvasFlowNode>[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => CanvasMutationResult;
  updateViewport: (viewport: Viewport) => void;
  updateNodeData: (
    nodeId: string,
    patch: Partial<CanvasFlowNodeData>
  ) => CanvasMutationResult;
  applyServerNodePatch: ({
    patch,
    revision,
    updatedAt,
  }: {
    patch: CanvasNodePatch;
    revision?: number | null;
    updatedAt?: string | null;
  }) => void;
  getGraph: () => SerializedCanvasGraph;
  markSaving: () => void;
  finishSave: ({
    revision,
    updatedAt,
    savedGraphString,
  }: {
    revision: number;
    updatedAt: string | null;
    savedGraphString: string;
  }) => void;
  failSave: (message: string) => void;
  enterConflict: (message: string) => void;
  clearConflict: () => void;
};

function hasPersistentNodeChanges(changes: NodeChange<CanvasFlowNode>[]) {
  return changes.some((change) => change.type !== 'select');
}

function hasPersistentEdgeChanges(changes: EdgeChange[]) {
  return changes.some((change) => change.type !== 'select');
}

function hasNodeDataChanged(
  current: CanvasFlowNodeData,
  next: CanvasFlowNodeData
): boolean {
  return JSON.stringify(current) !== JSON.stringify(next);
}

function isCanvasLeftHandleId(handleId?: string | null): boolean {
  return Boolean(handleId) && handleId !== 'right';
}

function buildCanvasEdgeId(connection: {
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
}) {
  return `xy-edge__${connection.source}${connection.sourceHandle || ''}-${connection.target}${connection.targetHandle || ''}`;
}

function normalizeCanvasConnectionDirection(connection: {
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
}) {
  if (
    isCanvasLeftHandleId(connection.sourceHandle) &&
    !isCanvasLeftHandleId(connection.targetHandle)
  ) {
    return {
      source: connection.target,
      target: connection.source,
      sourceHandle: connection.targetHandle,
      targetHandle: connection.sourceHandle,
    };
  }

  return connection;
}

export const useCanvasStore = create<CanvasStoreState>()((set, get) => ({
  canvasId: null,
  nodes: [],
  edges: [],
  viewport: normalizeCanvasViewport(),
  revision: 1,
  savedGraphString: JSON.stringify(
    buildCanvasGraphFromFlow({
      nodes: [],
      edges: [],
      viewport: normalizeCanvasViewport(),
    })
  ),
  isHydrated: false,
  isDirty: false,
  saveStatus: 'idle',
  saveError: null,
  lastSavedAt: null,
  conflictDetected: false,
  hydrate: (canvas) => {
    set({
      canvasId: canvas.id,
      nodes: graphToFlowNodes(canvas.graph),
      edges: graphToFlowEdges(canvas.graph),
      viewport: normalizeCanvasViewport(canvas.graph.viewport),
      revision: canvas.revision,
      savedGraphString: JSON.stringify(canvas.graph),
      isHydrated: true,
      isDirty: false,
      saveStatus: 'idle',
      saveError: null,
      lastSavedAt: canvas.updatedAt,
      conflictDetected: false,
    });
  },
  addNode: (nodeType, position, locale) => {
    const { nodes, conflictDetected } = get();

    if (conflictDetected) {
      return {
        ok: false,
        code: 'invalid_graph',
        message: '画布当前存在版本冲突，请先加载最新版本。',
      };
    }

    if (nodes.length >= CANVAS_GRAPH_LIMITS.maxNodes) {
      return {
        ok: false,
        code: 'invalid_graph',
        message: `画布最多支持 ${CANVAS_GRAPH_LIMITS.maxNodes} 个节点。`,
      };
    }

    const defaultPosition = position || {
      x: 120 + nodes.length * 32,
      y: 120 + nodes.length * 24,
    };
    const nextNode = {
      ...createCanvasFlowNode(nodeType, defaultPosition, locale),
      selected: true,
    };

    set((state) => ({
      nodes: [
        ...state.nodes.map((node) => ({
          ...node,
          selected: false,
        })),
        nextNode,
      ],
      isDirty: true,
      saveStatus: state.saveStatus === 'saving' ? 'saving' : 'idle',
      saveError: null,
    }));

    return {
      ok: true,
      nodeId: nextNode.id,
    };
  },
  duplicateNode: (nodeId) => {
    const { nodes, conflictDetected } = get();

    if (conflictDetected) {
      return {
        ok: false,
        code: 'invalid_graph',
        message: '画布当前存在版本冲突，请先加载最新版本。',
      };
    }

    const sourceNode = nodes.find((node) => node.id === nodeId);
    if (!sourceNode) {
      return {
        ok: false,
        code: 'invalid_graph',
        message: '未找到对应的画布节点。',
      };
    }

    if (nodes.length >= CANVAS_GRAPH_LIMITS.maxNodes) {
      return {
        ok: false,
        code: 'invalid_graph',
        message: `画布最多支持 ${CANVAS_GRAPH_LIMITS.maxNodes} 个节点。`,
      };
    }

    const baseNode = createCanvasFlowNode(sourceNode.data.nodeType, {
      x: sourceNode.position.x + 48,
      y: sourceNode.position.y + 48,
    });
    const duplicatedNode: CanvasFlowNode = {
      ...baseNode,
      selected: true,
      data: normalizeCanvasNodeData(sourceNode.data.nodeType, sourceNode.data),
    };

    set((state) => ({
      nodes: [
        ...state.nodes.map((node) => ({
          ...node,
          selected: false,
        })),
        duplicatedNode,
      ],
      isDirty: true,
      saveStatus: state.saveStatus === 'saving' ? 'saving' : 'idle',
      saveError: null,
    }));

    return {
      ok: true,
      nodeId: duplicatedNode.id,
    };
  },
  pasteClipboard: ({ nodes: clipboardNodes, edges: clipboardEdges, offset }) => {
    const { nodes, edges, conflictDetected } = get();

    if (conflictDetected) {
      return {
        ok: false,
        code: 'invalid_graph',
        message: '画布当前存在版本冲突，请先加载最新版本。',
      };
    }

    if (clipboardNodes.length === 0) {
      return {
        ok: false,
        code: 'invalid_graph',
        message: '未找到对应的画布节点。',
      };
    }

    if (nodes.length + clipboardNodes.length > CANVAS_GRAPH_LIMITS.maxNodes) {
      return {
        ok: false,
        code: 'invalid_graph',
        message: `画布最多支持 ${CANVAS_GRAPH_LIMITS.maxNodes} 个节点。`,
      };
    }

    const validClipboardEdges = clipboardEdges.filter((edge) =>
      clipboardNodes.some((node) => node.id === edge.source) &&
      clipboardNodes.some((node) => node.id === edge.target)
    );

    if (edges.length + validClipboardEdges.length > CANVAS_GRAPH_LIMITS.maxEdges) {
      return {
        ok: false,
        code: 'invalid_graph',
        message: `画布最多支持 ${CANVAS_GRAPH_LIMITS.maxEdges} 条连线。`,
      };
    }

    const appliedOffset = {
      x: Number(offset?.x || 0),
      y: Number(offset?.y || 0),
    };
    const idMap = new Map<string, string>();
    const pastedNodes = clipboardNodes.map((node) => {
      const nextNode = createCanvasFlowNode(node.type, {
        x: node.position.x + appliedOffset.x,
        y: node.position.y + appliedOffset.y,
      });
      idMap.set(node.id, nextNode.id);

      return {
        ...nextNode,
        selected: true,
        data: normalizeCanvasNodeData(node.type, node.data),
      };
    });
    const pastedEdges: Edge[] = validClipboardEdges.flatMap((edge) => {
      const source = idMap.get(edge.source);
      const target = idMap.get(edge.target);
      if (!source || !target) {
        return [];
      }

      const normalizedConnection = normalizeCanvasConnectionDirection({
        source,
        target,
        sourceHandle: edge.sourceHandle,
        targetHandle: edge.targetHandle,
      });

      return [
        {
          id: buildCanvasEdgeId(normalizedConnection),
          source: normalizedConnection.source,
          target: normalizedConnection.target,
          sourceHandle: normalizedConnection.sourceHandle || undefined,
          targetHandle: normalizedConnection.targetHandle || undefined,
          type:
            typeof edge.type === 'string' && edge.type.trim()
              ? edge.type
              : 'default',
          data: edge.data,
          animated: false,
          selected: false,
        },
      ];
    });

    set((state) => ({
      nodes: [
        ...state.nodes.map((node) => ({
          ...node,
          selected: false,
        })),
        ...pastedNodes,
      ],
      edges: [
        ...state.edges.map((edge) => ({
          ...edge,
          selected: false,
        })),
        ...pastedEdges,
      ],
      isDirty: true,
      saveStatus: state.saveStatus === 'saving' ? 'saving' : 'idle',
      saveError: null,
    }));

    return { ok: true };
  },
  deleteNode: (nodeId) => {
    const { conflictDetected } = get();
    if (conflictDetected) {
      return;
    }

    set((state) => {
      const hasNode = state.nodes.some((node) => node.id === nodeId);
      if (!hasNode) {
        return state;
      }

      return {
        ...state,
        nodes: state.nodes.filter((node) => node.id !== nodeId),
        edges: state.edges.filter(
          (edge) => edge.source !== nodeId && edge.target !== nodeId
        ),
        isDirty: true,
        saveStatus: state.saveStatus === 'saving' ? 'saving' : 'idle',
        saveError: null,
      };
    });
  },
  deleteEdge: (edgeId) => {
    const { conflictDetected } = get();
    if (conflictDetected) {
      return;
    }

    set((state) => {
      if (!state.edges.some((edge) => edge.id === edgeId)) {
        return state;
      }

      return {
        ...state,
        edges: state.edges.filter((edge) => edge.id !== edgeId),
        isDirty: true,
        saveStatus: state.saveStatus === 'saving' ? 'saving' : 'idle',
        saveError: null,
      };
    });
  },
  updateEdgeTargetHandle: (edgeId, targetHandle) => {
    const { conflictDetected } = get();
    if (conflictDetected) {
      return {
        ok: false,
        code: 'invalid_graph',
        message: '画布当前存在版本冲突，请先加载最新版本。',
      };
    }

    let changed = false;
    set((state) => ({
      edges: (() => {
        const nextTargetHandle = targetHandle.trim() || 'left';
        const updatedEdges = state.edges.map((edge) => {
          if (edge.id !== edgeId) {
            return edge;
          }

          if ((edge.targetHandle || 'left') === nextTargetHandle) {
            return edge;
          }

          changed = true;
          return {
            ...edge,
            targetHandle: nextTargetHandle,
          };
        });

        const seenKeys = new Map<string, number>();
        const dedupedEdges: Edge[] = [];

        for (const edge of updatedEdges) {
          const semanticKey = [
            edge.source,
            edge.sourceHandle || '',
            edge.target,
            edge.targetHandle || '',
          ].join('::');
          const existingIndex = seenKeys.get(semanticKey);

          if (existingIndex === undefined) {
            seenKeys.set(semanticKey, dedupedEdges.length);
            dedupedEdges.push(edge);
            continue;
          }

          if (edge.id === edgeId) {
            dedupedEdges[existingIndex] = edge;
            changed = true;
          }
        }

        if (dedupedEdges.length !== state.edges.length) {
          changed = true;
        }

        return dedupedEdges;
      })(),
      isDirty: changed ? true : state.isDirty,
      saveStatus:
        changed && state.saveStatus !== 'saving' ? 'idle' : state.saveStatus,
      saveError: changed ? null : state.saveError,
    }));

    return changed
      ? { ok: true }
      : {
          ok: false,
          code: 'invalid_graph',
          message: '没有可应用的连线变更。',
        };
  },
  deleteIncomingReference: (targetNodeId, sourceNodeId) => {
    const { conflictDetected } = get();
    if (conflictDetected) {
      return;
    }

    set((state) => {
      const nextEdges = state.edges.filter(
        (edge) =>
          !(edge.source === sourceNodeId && edge.target === targetNodeId)
      );

      if (nextEdges.length === state.edges.length) {
        return state;
      }

      return {
        ...state,
        edges: nextEdges,
        isDirty: true,
        saveStatus: state.saveStatus === 'saving' ? 'saving' : 'idle',
        saveError: null,
      };
    });
  },
  deleteSelection: () => {
    const { conflictDetected } = get();
    if (conflictDetected) {
      return;
    }

    set((state) => {
      const nextNodes = state.nodes.filter((node) => !node.selected);
      const selectedNodeIds = new Set(
        state.nodes.filter((node) => node.selected).map((node) => node.id)
      );
      const nextEdges = state.edges.filter(
        (edge) =>
          !edge.selected &&
          !selectedNodeIds.has(edge.source) &&
          !selectedNodeIds.has(edge.target)
      );

      if (
        nextNodes.length === state.nodes.length &&
        nextEdges.length === state.edges.length
      ) {
        return state;
      }

      return {
        ...state,
        nodes: nextNodes,
        edges: nextEdges,
        isDirty: true,
        saveStatus: state.saveStatus === 'saving' ? 'saving' : 'idle',
        saveError: null,
      };
    });
  },
  onNodesChange: (changes) => {
    const { conflictDetected } = get();
    if (conflictDetected) {
      return;
    }

    set((state) => ({
      nodes: applyNodeChanges<CanvasFlowNode>(changes, state.nodes),
      isDirty: state.isDirty || hasPersistentNodeChanges(changes),
      saveStatus:
        state.saveStatus === 'saving'
          ? 'saving'
          : hasPersistentNodeChanges(changes)
            ? 'idle'
            : state.saveStatus,
      saveError: hasPersistentNodeChanges(changes) ? null : state.saveError,
    }));
  },
  onEdgesChange: (changes) => {
    const { conflictDetected } = get();
    if (conflictDetected) {
      return;
    }

    set((state) => ({
      edges: applyEdgeChanges(changes, state.edges),
      isDirty: state.isDirty || hasPersistentEdgeChanges(changes),
      saveStatus:
        state.saveStatus === 'saving'
          ? 'saving'
          : hasPersistentEdgeChanges(changes)
            ? 'idle'
            : state.saveStatus,
      saveError: hasPersistentEdgeChanges(changes) ? null : state.saveError,
    }));
  },
  onConnect: (connection) => {
    const { nodes, edges, conflictDetected } = get();

    if (conflictDetected) {
      return {
        ok: false,
        code: 'invalid_graph',
        message: '画布当前存在版本冲突，请先加载最新版本。',
      };
    }

    if (!connection.source || !connection.target) {
      return {
        ok: false,
        code: 'invalid_graph',
        message: '画布连线信息不完整。',
      };
    }

    if (
      !connection.sourceHandle ||
      !connection.targetHandle ||
      isCanvasLeftHandleId(connection.sourceHandle) ===
        isCanvasLeftHandleId(connection.targetHandle)
    ) {
      return {
        ok: false,
        code: 'invalid_graph',
        message:
          '画布连线必须连接两侧端点：左到右或右到左。',
      };
    }

    const normalizedConnection = isCanvasLeftHandleId(connection.sourceHandle)
      ? {
          ...connection,
          source: connection.target,
          target: connection.source,
          sourceHandle: connection.targetHandle,
          targetHandle: connection.sourceHandle,
        }
      : connection;

    if (edges.length >= CANVAS_GRAPH_LIMITS.maxEdges) {
      return {
        ok: false,
        code: 'invalid_graph',
        message: `画布最多支持 ${CANVAS_GRAPH_LIMITS.maxEdges} 条连线。`,
      };
    }

    if (
      edges.some(
        (edge) =>
          edge.source === normalizedConnection.source &&
          edge.target === normalizedConnection.target &&
          edge.sourceHandle === normalizedConnection.sourceHandle &&
          edge.targetHandle === normalizedConnection.targetHandle
      )
    ) {
      return {
        ok: false,
        code: 'invalid_graph',
        message: '这条画布连线已存在。',
      };
    }

    if (
      wouldCreateCanvasCycle({
        nodeIds: nodes.map((node) => node.id),
        edges: edges.map((edge) => ({
          source: edge.source,
          target: edge.target,
        })),
        source: normalizedConnection.source,
        target: normalizedConnection.target,
      })
    ) {
      return {
        ok: false,
        code: 'graph_cycle_detected',
        message: '画布中不允许出现循环连线。',
      };
    }

    set((state) => ({
      edges: [
        ...state.edges,
        {
          id: buildCanvasEdgeId(normalizedConnection),
          source: normalizedConnection.source,
          target: normalizedConnection.target,
          sourceHandle: normalizedConnection.sourceHandle,
          targetHandle: normalizedConnection.targetHandle,
          type: 'default',
          animated: false,
        },
      ],
      isDirty: true,
      saveStatus: state.saveStatus === 'saving' ? 'saving' : 'idle',
      saveError: null,
    }));

    return { ok: true };
  },
  updateViewport: (viewport) => {
    const normalizedViewport = normalizeCanvasViewport(viewport);
    set((state) => {
      if (
        state.viewport.x === normalizedViewport.x &&
        state.viewport.y === normalizedViewport.y &&
        state.viewport.zoom === normalizedViewport.zoom
      ) {
        return state;
      }

      return {
        ...state,
        viewport: normalizedViewport,
        isDirty: true,
        saveStatus: state.saveStatus === 'saving' ? 'saving' : 'idle',
        saveError: null,
      };
    });
  },
  updateNodeData: (nodeId, patch) => {
    const { conflictDetected } = get();
    if (conflictDetected) {
      return {
        ok: false,
        code: 'invalid_graph',
        message: '画布当前存在版本冲突，请先加载最新版本。',
      };
    }

    let changed = false;
    set((state) => ({
      nodes: state.nodes.map((node) => {
        if (node.id !== nodeId) {
          return node;
        }

        const nextData = normalizeCanvasNodeData(node.data.nodeType, {
          ...node.data,
          ...patch,
        });

        if (!hasNodeDataChanged(node.data, nextData)) {
          return node;
        }

        changed = true;
        return {
          ...node,
          data: nextData,
        };
      }),
      isDirty: changed ? true : state.isDirty,
      saveStatus:
        changed && state.saveStatus !== 'saving' ? 'idle' : state.saveStatus,
      saveError: changed ? null : state.saveError,
    }));

    return changed
      ? { ok: true }
      : {
          ok: false,
          code: 'invalid_graph',
          message: '没有可应用的节点变更。',
        };
  },
  applyServerNodePatch: ({ patch, revision, updatedAt }) => {
    set((state) => {
      let changed = false;

      const nextNodes = state.nodes.map((node) => {
        if (node.id !== patch.nodeId) {
          return node;
        }

        const nextData = applyCanvasNodePatchToData(node.data, patch);
        if (!hasNodeDataChanged(node.data, nextData)) {
          return node;
        }

        changed = true;
        return {
          ...node,
          data: nextData,
        };
      });

      if (!changed && revision == null && updatedAt === undefined) {
        return state;
      }

      return {
        ...state,
        nodes: nextNodes,
        revision: revision ?? state.revision,
        savedGraphString:
          revision == null && updatedAt === undefined
            ? state.savedGraphString
            : JSON.stringify(
                applyCanvasNodePatch(
                  parseCanvasGraph(state.savedGraphString),
                  patch
                ) || parseCanvasGraph(state.savedGraphString)
              ),
        lastSavedAt: updatedAt === undefined ? state.lastSavedAt : updatedAt,
        saveStatus: state.conflictDetected
          ? 'conflict'
          : state.isDirty
            ? state.saveStatus
            : 'saved',
        saveError: state.conflictDetected ? state.saveError : null,
      };
    });
  },
  getGraph: () => {
    const state = get();
    return buildCanvasGraphFromFlow({
      nodes: state.nodes,
      edges: state.edges,
      viewport: state.viewport,
    });
  },
  markSaving: () => {
    set((state) => ({
      saveStatus: state.conflictDetected ? 'conflict' : 'saving',
      saveError: null,
    }));
  },
  finishSave: ({ revision, updatedAt, savedGraphString }) => {
    set((state) => {
      const currentGraphString = JSON.stringify(
        buildCanvasGraphFromFlow({
          nodes: state.nodes,
          edges: state.edges,
          viewport: state.viewport,
        })
      );
      const isStillDirty = currentGraphString !== savedGraphString;

      return {
        ...state,
        revision,
        savedGraphString,
        lastSavedAt: updatedAt,
        isDirty: isStillDirty,
        saveStatus: state.conflictDetected
          ? 'conflict'
          : isStillDirty
            ? 'idle'
            : 'saved',
        saveError: null,
      };
    });
  },
  failSave: (message) => {
    set((state) => ({
      saveStatus: state.conflictDetected ? 'conflict' : 'error',
      saveError: message,
      isDirty: state.isDirty,
    }));
  },
  enterConflict: (message) => {
    set({
      conflictDetected: true,
      saveStatus: 'conflict',
      saveError: message,
    });
  },
  clearConflict: () => {
    set((state) => ({
      ...state,
      conflictDetected: false,
      saveStatus: state.isDirty ? 'idle' : 'saved',
      saveError: null,
    }));
  },
}));
