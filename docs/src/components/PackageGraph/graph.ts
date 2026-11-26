import { Graph, layout } from '@dagrejs/dagre';
import type { Node, Viewport, XYPosition } from '@xyflow/react';

import type {
  DependencyKind,
  PackageEdge,
  WorkspacePackage,
} from '@site/plugins/workspace-packages/types';
import type { DocState } from '@site/src/lib/workspace-packages';

export type Direction = 'LR' | 'TB';

/** How a node relates to the focused package. `none` when nothing is focused. */
export type Emphasis = 'none' | 'focus' | 'dependency' | 'dependent' | 'dimmed';

export type PackageNodeData = {
  pkg: WorkspacePackage;
  groupLabel: string;
  docState: DocState;
  direction: Direction;
  emphasis: Emphasis;
};

export type PackageNodeType = Node<PackageNodeData, 'package'>;

export const NODE_WIDTH = 208;
export const NODE_HEIGHT = 50;

/** Higher wins when the same package pair is linked by several dependency kinds. */
const KIND_STRENGTH: Record<DependencyKind, number> = { prod: 2, peer: 1, dev: 0 };

/**
 * One edge per `source -> target` pair, keeping the strongest kind (prod > peer > dev). A package
 * can list the same dependency as a dev and a peer dependency; drawing both would stack two arrows.
 */
export const collapseEdges = (edges: PackageEdge[]): PackageEdge[] => {
  const strongest = new Map<string, PackageEdge>();

  edges.forEach((edge) => {
    const key = `${edge.source}->${edge.target}`;
    const current = strongest.get(key);

    if (current === undefined || KIND_STRENGTH[edge.kind] > KIND_STRENGTH[current.kind]) {
      strongest.set(key, edge);
    }
  });

  return [...strongest.values()];
};

const GRID_GAP = 16;
const GRID_OFFSET = 96;
const GRID_MIN_LINES = 4;

/**
 * Top-left positions of the nodes. Connected nodes are laid out with dagre. Nodes without any
 * edge go in a grid along the flow (right of the graph in LR, below it in TB): dagre would stack
 * them in tall rank columns and shrink the whole map.
 */
export const computeLayout = (
  nodeIds: string[],
  edges: PackageEdge[],
  direction: Direction
): Map<string, XYPosition> => {
  const connectedIds = new Set(edges.flatMap((edge) => [edge.source, edge.target]));
  const graph = new Graph();

  graph.setGraph({
    rankdir: direction,
    nodesep: direction === 'LR' ? 10 : 20,
    ranksep: direction === 'LR' ? 120 : 90,
  });
  graph.setDefaultEdgeLabel(() => ({}));
  nodeIds
    .filter((id) => connectedIds.has(id) === true)
    .forEach((id) => graph.setNode(id, { width: NODE_WIDTH, height: NODE_HEIGHT }));
  edges.forEach((edge) => graph.setEdge(edge.source, edge.target));

  layout(graph);

  const positions = new Map<string, XYPosition>(
    graph.nodes().map((id) => {
      const { x = 0, y = 0 } = graph.node(id);

      return [id, { x: x - NODE_WIDTH / 2, y: y - NODE_HEIGHT / 2 }];
    })
  );

  const { width = 0, height = 0 } = graph.graph();
  const hasGraph = positions.size > 0;
  const stepX = NODE_WIDTH + GRID_GAP;
  const stepY = NODE_HEIGHT + GRID_GAP;

  nodeIds
    .filter((id) => connectedIds.has(id) === false)
    .forEach((id, index) => {
      if (direction === 'LR') {
        const rows = Math.max(GRID_MIN_LINES, Math.floor((height + GRID_GAP) / stepY));
        const left = hasGraph === true ? width + GRID_OFFSET : 0;

        positions.set(id, {
          x: left + Math.floor(index / rows) * stepX,
          y: (index % rows) * stepY,
        });
      } else {
        const columns = Math.max(GRID_MIN_LINES, Math.floor((width + GRID_GAP) / stepX));
        const top = hasGraph === true ? height + GRID_OFFSET : 0;

        positions.set(id, {
          x: (index % columns) * stepX,
          y: top + Math.floor(index / columns) * stepY,
        });
      }
    });

  return positions;
};

export type Insets = { top: number; right: number; bottom: number; left: number };

/**
 * Viewport showing the given nodes centered in the container minus `insets` (in screen pixels,
 * e.g. to keep clear of a panel), with the zoom clamped to `zoomRange`.
 */
export const getFramingViewport = (
  positions: Map<string, XYPosition>,
  nodeIds: string[],
  container: { width: number; height: number },
  insets: Insets,
  zoomRange: { min: number; max: number }
): Viewport => {
  const points = nodeIds.map((id) => positions.get(id)).filter((point) => point !== undefined);

  if (points.length === 0) {
    return { x: 0, y: 0, zoom: 1 };
  }

  const minX = Math.min(...points.map((point) => point.x));
  const minY = Math.min(...points.map((point) => point.y));
  const boundsWidth = Math.max(...points.map((point) => point.x)) + NODE_WIDTH - minX;
  const boundsHeight = Math.max(...points.map((point) => point.y)) + NODE_HEIGHT - minY;
  const availableWidth = Math.max(1, container.width - insets.left - insets.right);
  const availableHeight = Math.max(1, container.height - insets.top - insets.bottom);
  const zoom = Math.min(
    zoomRange.max,
    Math.max(zoomRange.min, Math.min(availableWidth / boundsWidth, availableHeight / boundsHeight))
  );

  return {
    x: insets.left + (availableWidth - boundsWidth * zoom) / 2 - minX * zoom,
    y: insets.top + (availableHeight - boundsHeight * zoom) / 2 - minY * zoom,
    zoom,
  };
};

/**
 * Packages reachable from `start`: its transitive dependencies (`down`) or dependents (`up`).
 * `start` itself is excluded, cycles are handled.
 */
export const collectReachable = (
  start: string,
  edges: PackageEdge[],
  direction: 'down' | 'up'
): Set<string> => {
  const neighbors = new Map<string, string[]>();

  edges.forEach((edge) => {
    const [from, to] =
      direction === 'down' ? [edge.source, edge.target] : [edge.target, edge.source];

    neighbors.set(from, [...(neighbors.get(from) ?? []), to]);
  });

  const reached = new Set<string>();
  const queue = [start];

  // `queue` grows while iterating: a breadth-first traversal without `shift()`.
  for (const current of queue) {
    (neighbors.get(current) ?? []).forEach((next) => {
      if (next !== start && reached.has(next) === false) {
        reached.add(next);
        queue.push(next);
      }
    });
  }

  return reached;
};
