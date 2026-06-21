import {
  CanvasNodeType,
  type SerializedCanvasEdge,
  type SerializedCanvasGraph,
  type SerializedCanvasNode,
} from '@/shared/lib/canvas/types';

export const CANVAS_GRAPH_LIMITS = {
  maxNodes: 200,
  maxEdges: 400,
} as const;

export type CanvasGraphValidationCode =
  | 'invalid_graph'
  | 'invalid_node_type'
  | 'graph_cycle_detected';

export type CanvasGraphValidationResult =
  | {
      ok: true;
      graph: SerializedCanvasGraph;
    }
  | {
      ok: false;
      code: CanvasGraphValidationCode;
      message: string;
    };

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isCanvasNodeType(value: unknown): value is CanvasNodeType {
  return (
    value === 'text' ||
    value === 'note' ||
    value === 'image' ||
    value === 'video' ||
    value === 'audio'
  );
}

function parseSerializedNode(
  value: unknown
): SerializedCanvasNode | CanvasGraphValidationResult {
  if (!isRecord(value)) {
    return {
      ok: false,
      code: 'invalid_graph',
      message: 'canvas node payload is invalid',
    };
  }

  if (typeof value.id !== 'string' || !value.id.trim()) {
    return {
      ok: false,
      code: 'invalid_graph',
      message: 'canvas node id is required',
    };
  }

  if (!isCanvasNodeType(value.type)) {
    return {
      ok: false,
      code: 'invalid_node_type',
      message: 'canvas node type is invalid',
    };
  }

  if (!isRecord(value.position)) {
    return {
      ok: false,
      code: 'invalid_graph',
      message: 'canvas node position is required',
    };
  }

  const x = Number(value.position.x);
  const y = Number(value.position.y);
  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    return {
      ok: false,
      code: 'invalid_graph',
      message: 'canvas node position is invalid',
    };
  }

  if (value.width !== undefined && !isFiniteNumber(value.width)) {
    return {
      ok: false,
      code: 'invalid_graph',
      message: 'canvas node width is invalid',
    };
  }

  if (value.height !== undefined && !isFiniteNumber(value.height)) {
    return {
      ok: false,
      code: 'invalid_graph',
      message: 'canvas node height is invalid',
    };
  }

  if (value.data !== undefined && !isRecord(value.data)) {
    return {
      ok: false,
      code: 'invalid_graph',
      message: 'canvas node data is invalid',
    };
  }

  return {
    id: value.id,
    type: value.type,
    position: { x, y },
    width: value.width,
    height: value.height,
    data: value.data,
  };
}

function parseSerializedEdge(
  value: unknown
): SerializedCanvasEdge | CanvasGraphValidationResult {
  if (!isRecord(value)) {
    return {
      ok: false,
      code: 'invalid_graph',
      message: 'canvas edge payload is invalid',
    };
  }

  if (typeof value.id !== 'string' || !value.id.trim()) {
    return {
      ok: false,
      code: 'invalid_graph',
      message: 'canvas edge id is required',
    };
  }

  if (typeof value.source !== 'string' || !value.source.trim()) {
    return {
      ok: false,
      code: 'invalid_graph',
      message: 'canvas edge source is required',
    };
  }

  if (typeof value.target !== 'string' || !value.target.trim()) {
    return {
      ok: false,
      code: 'invalid_graph',
      message: 'canvas edge target is required',
    };
  }

  if (value.type !== undefined && typeof value.type !== 'string') {
    return {
      ok: false,
      code: 'invalid_graph',
      message: 'canvas edge type is invalid',
    };
  }

  if (
    value.sourceHandle !== undefined &&
    typeof value.sourceHandle !== 'string'
  ) {
    return {
      ok: false,
      code: 'invalid_graph',
      message: 'canvas edge source handle is invalid',
    };
  }

  if (
    value.targetHandle !== undefined &&
    typeof value.targetHandle !== 'string'
  ) {
    return {
      ok: false,
      code: 'invalid_graph',
      message: 'canvas edge target handle is invalid',
    };
  }

  if (value.data !== undefined && !isRecord(value.data)) {
    return {
      ok: false,
      code: 'invalid_graph',
      message: 'canvas edge data is invalid',
    };
  }

  return {
    id: value.id,
    source: value.source,
    target: value.target,
    sourceHandle: value.sourceHandle,
    targetHandle: value.targetHandle,
    type: value.type,
    data: value.data,
  };
}

export function parseCanvasGraphPayload(
  value: unknown
): CanvasGraphValidationResult {
  if (!isRecord(value)) {
    return {
      ok: false,
      code: 'invalid_graph',
      message: 'canvas graph payload is invalid',
    };
  }

  if (value.version !== undefined && value.version !== 1) {
    return {
      ok: false,
      code: 'invalid_graph',
      message: 'canvas graph version is invalid',
    };
  }

  if (!isRecord(value.viewport)) {
    return {
      ok: false,
      code: 'invalid_graph',
      message: 'canvas viewport is required',
    };
  }

  const viewportX = Number(value.viewport.x);
  const viewportY = Number(value.viewport.y);
  const viewportZoom = Number(value.viewport.zoom);
  if (
    !Number.isFinite(viewportX) ||
    !Number.isFinite(viewportY) ||
    !Number.isFinite(viewportZoom)
  ) {
    return {
      ok: false,
      code: 'invalid_graph',
      message: 'canvas viewport is invalid',
    };
  }

  if (!Array.isArray(value.nodes) || !Array.isArray(value.edges)) {
    return {
      ok: false,
      code: 'invalid_graph',
      message: 'canvas graph nodes or edges are invalid',
    };
  }

  const nodes: SerializedCanvasNode[] = [];
  for (const item of value.nodes) {
    const parsedNode = parseSerializedNode(item);
    if ('ok' in parsedNode) {
      return parsedNode;
    }
    nodes.push(parsedNode);
  }

  const edges: SerializedCanvasEdge[] = [];
  for (const item of value.edges) {
    const parsedEdge = parseSerializedEdge(item);
    if ('ok' in parsedEdge) {
      return parsedEdge;
    }
    edges.push(parsedEdge);
  }

  return validateCanvasGraph({
    version: 1,
    viewport: {
      x: viewportX,
      y: viewportY,
      zoom: viewportZoom,
    },
    nodes,
    edges,
  });
}

export function detectCanvasGraphCycle(
  graph: Pick<SerializedCanvasGraph, 'nodes' | 'edges'>
): boolean {
  const adjacency = new Map<string, string[]>();
  const visitState = new Map<string, 0 | 1 | 2>();

  for (const node of graph.nodes) {
    adjacency.set(node.id, []);
    visitState.set(node.id, 0);
  }

  for (const edge of graph.edges) {
    const targets = adjacency.get(edge.source);
    if (!targets) {
      continue;
    }
    targets.push(edge.target);
  }

  const walk = (nodeId: string): boolean => {
    const state = visitState.get(nodeId) || 0;
    if (state === 1) {
      return true;
    }

    if (state === 2) {
      return false;
    }

    visitState.set(nodeId, 1);
    const targets = adjacency.get(nodeId) || [];
    for (const target of targets) {
      if (walk(target)) {
        return true;
      }
    }

    visitState.set(nodeId, 2);
    return false;
  };

  for (const node of graph.nodes) {
    if (walk(node.id)) {
      return true;
    }
  }

  return false;
}

export function wouldCreateCanvasCycle({
  nodeIds,
  edges,
  source,
  target,
}: {
  nodeIds: string[];
  edges: Pick<SerializedCanvasEdge, 'source' | 'target'>[];
  source: string;
  target: string;
}): boolean {
  if (source === target) {
    return true;
  }

  const adjacency = new Map<string, string[]>();
  for (const nodeId of nodeIds) {
    adjacency.set(nodeId, []);
  }

  for (const edge of edges) {
    const nextTargets = adjacency.get(edge.source);
    if (nextTargets) {
      nextTargets.push(edge.target);
    }
  }

  const stack = [target];
  const visited = new Set<string>();

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current || visited.has(current)) {
      continue;
    }

    if (current === source) {
      return true;
    }

    visited.add(current);
    for (const next of adjacency.get(current) || []) {
      stack.push(next);
    }
  }

  return false;
}

export function validateCanvasGraph(
  graph: SerializedCanvasGraph
): CanvasGraphValidationResult {
  if (graph.nodes.length > CANVAS_GRAPH_LIMITS.maxNodes) {
    return {
      ok: false,
      code: 'invalid_graph',
      message: `canvas node count exceeds ${CANVAS_GRAPH_LIMITS.maxNodes}`,
    };
  }

  if (graph.edges.length > CANVAS_GRAPH_LIMITS.maxEdges) {
    return {
      ok: false,
      code: 'invalid_graph',
      message: `canvas edge count exceeds ${CANVAS_GRAPH_LIMITS.maxEdges}`,
    };
  }

  const nodeIds = new Set<string>();
  for (const node of graph.nodes) {
    if (nodeIds.has(node.id)) {
      return {
        ok: false,
        code: 'invalid_graph',
        message: 'duplicate canvas node id detected',
      };
    }
    nodeIds.add(node.id);
  }

  const edgeIds = new Set<string>();
  for (const edge of graph.edges) {
    if (edgeIds.has(edge.id)) {
      return {
        ok: false,
        code: 'invalid_graph',
        message: 'duplicate canvas edge id detected',
      };
    }
    edgeIds.add(edge.id);

    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) {
      return {
        ok: false,
        code: 'invalid_graph',
        message: 'canvas edge references missing node',
      };
    }

    if (edge.source === edge.target) {
      return {
        ok: false,
        code: 'graph_cycle_detected',
        message: 'canvas edge cannot target itself',
      };
    }
  }

  if (detectCanvasGraphCycle(graph)) {
    return {
      ok: false,
      code: 'graph_cycle_detected',
      message: 'canvas graph contains a cycle',
    };
  }

  return {
    ok: true,
    graph,
  };
}
