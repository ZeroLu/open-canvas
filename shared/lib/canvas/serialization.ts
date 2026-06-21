import { type Edge, type Node, type Viewport } from '@xyflow/react';

import {
  CanvasNodeData,
  CanvasNodeType,
  createDefaultCanvasNodeData,
  normalizeCanvasNodeData,
  SerializedCanvasEdge,
  SerializedCanvasGraph,
} from '@/shared/lib/canvas/types';

export type CanvasFlowNodeData = CanvasNodeData;

export type CanvasFlowNode = Node<CanvasFlowNodeData>;

function isCanvasLeftHandleId(handleId?: string | null): boolean {
  return Boolean(handleId) && handleId !== 'right';
}

function normalizeFlowEdgeDirection(edge: Edge): Edge {
  if (
    isCanvasLeftHandleId(edge.sourceHandle) &&
    !isCanvasLeftHandleId(edge.targetHandle)
  ) {
    return {
      ...edge,
      source: edge.target,
      target: edge.source,
      sourceHandle: edge.targetHandle,
      targetHandle: edge.sourceHandle,
    };
  }

  return edge;
}

export function createCanvasFlowNode(
  nodeType: CanvasNodeType,
  position: { x: number; y: number },
  locale?: string | null
): CanvasFlowNode {
  return {
    id: `${nodeType}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    type: nodeType,
    position,
    data: createDefaultCanvasNodeData(nodeType, locale),
  };
}

export function graphToFlowNodes(
  graph: SerializedCanvasGraph
): CanvasFlowNode[] {
  return graph.nodes.map((node) => ({
    id: node.id,
    type: node.type,
    position: node.position,
    width: node.width,
    height: node.height,
    data: normalizeCanvasNodeData(node.type, node.data),
  }));
}

export function graphToFlowEdges(graph: SerializedCanvasGraph): Edge[] {
  return graph.edges.map((edge) =>
    normalizeFlowEdgeDirection({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      sourceHandle: edge.sourceHandle,
      targetHandle: edge.targetHandle,
      type: edge.type === 'smoothstep' ? 'default' : edge.type || 'default',
      data: edge.data,
    })
  );
}

export function normalizeCanvasViewport(
  viewport?: Partial<Viewport>
): Viewport {
  return {
    x: Number(viewport?.x || 0),
    y: Number(viewport?.y || 0),
    zoom: Number(viewport?.zoom || 1),
  };
}

function serializeEdge(edge: Edge): SerializedCanvasEdge {
  const normalizedEdge = normalizeFlowEdgeDirection(edge);

  return {
    id: normalizedEdge.id,
    source: normalizedEdge.source,
    target: normalizedEdge.target,
    sourceHandle:
      typeof normalizedEdge.sourceHandle === 'string' &&
      normalizedEdge.sourceHandle.trim()
        ? normalizedEdge.sourceHandle
        : undefined,
    targetHandle:
      typeof normalizedEdge.targetHandle === 'string' &&
      normalizedEdge.targetHandle.trim()
        ? normalizedEdge.targetHandle
        : undefined,
    type:
      typeof normalizedEdge.type === 'string' &&
      normalizedEdge.type !== 'smoothstep'
        ? normalizedEdge.type
        : 'default',
    data:
      normalizedEdge.data &&
      typeof normalizedEdge.data === 'object' &&
      !Array.isArray(normalizedEdge.data)
        ? (normalizedEdge.data as Record<string, unknown>)
        : undefined,
  };
}

export function buildCanvasGraphFromFlow({
  nodes,
  edges,
  viewport,
}: {
  nodes: CanvasFlowNode[];
  edges: Edge[];
  viewport: Viewport;
}): SerializedCanvasGraph {
  return {
    version: 1,
    viewport: normalizeCanvasViewport(viewport),
    nodes: nodes.map((node) => ({
      id: node.id,
      type: (node.type || node.data.nodeType) as CanvasNodeType,
      position: {
        x: Number(node.position.x || 0),
        y: Number(node.position.y || 0),
      },
      width:
        typeof node.width === 'number' && Number.isFinite(node.width)
          ? node.width
          : undefined,
      height:
        typeof node.height === 'number' && Number.isFinite(node.height)
          ? node.height
          : undefined,
      data: normalizeCanvasNodeData(
        (node.type || node.data.nodeType) as CanvasNodeType,
        node.data
      ),
    })),
    edges: edges.map(serializeEdge),
  };
}
