import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import clsx from 'clsx';
import {
  Background,
  BackgroundVariant,
  ControlButton,
  Controls,
  MarkerType,
  MiniMap,
  Panel,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  useStore,
  useStoreApi,
  type Edge,
  type NodeTypes,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useLocation } from '@docusaurus/router';
import { useColorMode } from '@docusaurus/theme-common';

import type {
  DependencyKind,
  PackageEdge,
  PackageGroupId,
} from '@site/plugins/workspace-packages/types';
import { getPackageDocState, useWorkspacePackages } from '@site/src/lib/workspace-packages';

import DetailsPanel from './DetailsPanel';
import {
  collapseEdges,
  collectReachable,
  computeLayout,
  getFramingViewport,
  NODE_HEIGHT,
  NODE_WIDTH,
  type Direction,
  type Emphasis,
  type PackageNodeType,
} from './graph';
import PackageNode from './PackageNode';
import SearchBox from './SearchBox';
import styles from './styles.module.css';

const nodeTypes: NodeTypes = { package: PackageNode };

type EdgeRole = 'default' | 'dependency' | 'dependent' | 'dimmed';

/** Theme-aware: the variables are set per color mode on `.explorer` (see `styles.module.css`). */
const EDGE_STROKES: Record<EdgeRole, string> = {
  default: 'var(--graph-edge)',
  dependency: 'var(--graph-dependency)',
  dependent: 'var(--graph-dependent)',
  dimmed: 'var(--graph-edge-dimmed)',
};

const EDGE_DASH: Record<DependencyKind, string | undefined> = {
  prod: undefined,
  dev: '6 4',
  peer: '1.5 4',
};

const OPTIONAL_KINDS: Array<{ kind: Exclude<DependencyKind, 'prod'>; label: string }> = [
  { kind: 'dev', label: 'Dev' },
  { kind: 'peer', label: 'Peer' },
];

const readFocusFromUrl = (search: string, packageNames: Set<string>): string | null => {
  const focus = new URLSearchParams(search).get('focus');

  return focus !== null && packageNames.has(focus) === true ? focus : null;
};

/** Keeps `?focus=` in sync without a router navigation (no re-render, no scroll reset). */
const writeFocusToUrl = (focus: string | null) => {
  const url = new URL(window.location.href);

  if (focus === null) {
    url.searchParams.delete('focus');
  } else {
    url.searchParams.set('focus', focus);
  }

  // npm names are URL-safe: keep `?focus=@strapi/database` readable instead of `%40strapi%2F...`.
  const search = url.searchParams.toString().replaceAll('%40', '@').replaceAll('%2F', '/');

  window.history.replaceState(
    window.history.state,
    '',
    `${url.pathname}${search === '' ? '' : `?${search}`}${url.hash}`
  );
};

const ZOOM_RANGE = { min: 0.15, max: 2 };
/** Automatic framing never zooms in further than this. */
const FRAMING_MAX_ZOOM = 1.25;
const FRAMING_INSET = 24;
/** Details panel width (300px) plus margins, kept clear when framing a focused package. */
const PANEL_INSET = 340;
/** Below this canvas width the details panel covers most of the canvas anyway. */
const PANEL_INSET_MIN_CANVAS_WIDTH = 720;

const uniqueSorted = (names: string[]): string[] => [...new Set(names)].sort();

function Explorer(): ReactNode {
  const data = useWorkspacePackages();
  const { colorMode } = useColorMode();
  const location = useLocation();
  const { setViewport } = useReactFlow();
  const store = useStoreApi();
  // Only tells when the canvas gets measured. The size itself is read on demand (see `frame`), so
  // that resizing the window does not re-frame the map and reset the user's pan and zoom.
  const hasCanvasSize = useStore((state) => state.width > 0 && state.height > 0);

  const packageNames = useMemo(() => new Set(data.packages.map((pkg) => pkg.name)), [data]);
  const groupLabels = useMemo(
    () => new Map(data.groups.map((group) => [group.id, group.label])),
    [data]
  );
  const groupsInUse = useMemo(
    () =>
      [...data.groups]
        .sort((a, b) => a.position - b.position)
        .map((group) => ({
          ...group,
          count: data.packages.filter((pkg) => pkg.group === group.id).length,
        }))
        .filter((group) => group.count > 0),
    [data]
  );

  const [direction, setDirection] = useState<Direction>('LR');
  const [shownKinds, setShownKinds] = useState<Set<DependencyKind>>(() => new Set(['prod']));
  const [hiddenGroups, setHiddenGroups] = useState<Set<PackageGroupId>>(() => new Set());
  const [focus, setFocus] = useState<string | null>(() =>
    readFocusFromUrl(location.search, packageNames)
  );

  const focusPackage = useCallback(
    (packageName: string | null) => {
      setFocus(packageName);
      writeFocusToUrl(packageName);

      const pkg = data.packages.find((candidate) => candidate.name === packageName);

      // Focusing a package of a hidden group shows that group again.
      if (pkg !== undefined) {
        setHiddenGroups((groups) => {
          // Same reference when nothing changes: no re-layout on every click.
          if (groups.has(pkg.group) === false) {
            return groups;
          }

          const next = new Set(groups);
          next.delete(pkg.group);
          return next;
        });
      }
    },
    [data]
  );

  const visiblePackages = useMemo(
    () => data.packages.filter((pkg) => hiddenGroups.has(pkg.group) === false),
    [data, hiddenGroups]
  );

  const shownEdges = useMemo(
    () => collapseEdges(data.edges.filter((edge) => shownKinds.has(edge.kind) === true)),
    [data, shownKinds]
  );

  const visibleEdges = useMemo(() => {
    const visibleNames = new Set(visiblePackages.map((pkg) => pkg.name));

    return shownEdges.filter(
      (edge) => visibleNames.has(edge.source) === true && visibleNames.has(edge.target) === true
    );
  }, [visiblePackages, shownEdges]);

  const positions = useMemo(
    () =>
      computeLayout(
        visiblePackages.map((pkg) => pkg.name),
        visibleEdges,
        direction
      ),
    [visiblePackages, visibleEdges, direction]
  );

  const reachable = useMemo(() => {
    if (focus === null) {
      return null;
    }

    return {
      dependencies: collectReachable(focus, visibleEdges, 'down'),
      dependents: collectReachable(focus, visibleEdges, 'up'),
    };
  }, [focus, visibleEdges]);

  const getEmphasis = useCallback(
    (name: string): Emphasis => {
      if (reachable === null) {
        return 'none';
      }

      if (name === focus) {
        return 'focus';
      }

      if (reachable.dependencies.has(name) === true) {
        return 'dependency';
      }

      return reachable.dependents.has(name) === true ? 'dependent' : 'dimmed';
    },
    [focus, reachable]
  );

  const nodes = useMemo<PackageNodeType[]>(
    () =>
      visiblePackages.map((pkg) => ({
        id: pkg.name,
        type: 'package',
        position: positions.get(pkg.name) ?? { x: 0, y: 0 },
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
        data: {
          pkg,
          groupLabel: groupLabels.get(pkg.group) ?? pkg.group,
          docState: getPackageDocState(data, pkg.name),
          direction,
          emphasis: getEmphasis(pkg.name),
        },
      })),
    [data, visiblePackages, positions, groupLabels, direction, getEmphasis]
  );

  const edges = useMemo<Edge[]>(() => {
    const getRole = (edge: PackageEdge): EdgeRole => {
      if (reachable === null) {
        return 'default';
      }

      const isFromFocusSide =
        edge.source === focus || reachable.dependencies.has(edge.source) === true;

      if (isFromFocusSide === true && reachable.dependencies.has(edge.target) === true) {
        return 'dependency';
      }

      const isToFocusSide = edge.target === focus || reachable.dependents.has(edge.target) === true;

      if (isToFocusSide === true && reachable.dependents.has(edge.source) === true) {
        return 'dependent';
      }

      return 'dimmed';
    };

    return visibleEdges.map((edge) => {
      const role = getRole(edge);
      const isHighlighted = role === 'dependency' || role === 'dependent';

      return {
        id: `${edge.source}->${edge.target}`,
        source: edge.source,
        target: edge.target,
        zIndex: isHighlighted === true ? 1 : 0,
        focusable: false,
        style: {
          stroke: EDGE_STROKES[role],
          strokeWidth: isHighlighted === true ? 2 : 1.25,
          strokeDasharray: EDGE_DASH[edge.kind],
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 14,
          height: 14,
          color: EDGE_STROKES[role],
        },
      };
    });
  }, [visibleEdges, reachable, focus]);

  const hasFramedRef = useRef(false);

  /**
   * Frames the focused package with its dependencies and dependents, or the whole map.
   * Computed from the layout rather than with `fitView`, which does not apply reliably to
   * controlled nodes without `onNodesChange`.
   */
  const frame = useCallback(
    (duration: number) => {
      const { width: canvasWidth, height: canvasHeight } = store.getState();

      if (canvasWidth === 0 || canvasHeight === 0) {
        return;
      }

      const framedIds =
        focus !== null && reachable !== null
          ? [focus, ...reachable.dependencies, ...reachable.dependents]
          : visiblePackages.map((pkg) => pkg.name);
      const reservesPanel = focus !== null && canvasWidth >= PANEL_INSET_MIN_CANVAS_WIDTH;

      setViewport(
        getFramingViewport(
          positions,
          framedIds,
          { width: canvasWidth, height: canvasHeight },
          {
            top: FRAMING_INSET,
            right: reservesPanel === true ? PANEL_INSET : FRAMING_INSET,
            bottom: FRAMING_INSET,
            left: FRAMING_INSET,
          },
          { min: ZOOM_RANGE.min, max: FRAMING_MAX_ZOOM }
        ),
        { duration }
      );
    },
    [store, focus, reachable, visiblePackages, positions, setViewport]
  );

  // Frame once the canvas is measured (no animation), then whenever the focus, filters, layout
  // direction or visible packages change (`frame` changes with them). Not on resize.
  useEffect(() => {
    if (hasCanvasSize === false) {
      return;
    }

    frame(hasFramedRef.current === true ? 400 : 0);
    hasFramedRef.current = true;
  }, [frame, hasCanvasSize]);

  const focusedPackage = data.packages.find((pkg) => pkg.name === focus);

  const toggleKind = (kind: DependencyKind) =>
    setShownKinds((kinds) => {
      const next = new Set(kinds);

      if (next.has(kind) === true) {
        next.delete(kind);
      } else {
        next.add(kind);
      }

      return next;
    });

  const toggleGroup = (groupId: PackageGroupId) => {
    const isHiding = hiddenGroups.has(groupId) === false;

    // Hiding the focused package clears the focus instead of leaving everything dimmed.
    if (isHiding === true && focusedPackage !== undefined && focusedPackage.group === groupId) {
      focusPackage(null);
    }

    setHiddenGroups((groups) => {
      const next = new Set(groups);

      if (isHiding === true) {
        next.add(groupId);
      } else {
        next.delete(groupId);
      }

      return next;
    });
  };

  const reset = () => {
    setDirection('LR');
    setShownKinds(new Set(['prod']));
    setHiddenGroups(new Set());
    focusPackage(null);
  };

  return (
    <div className={styles.explorer}>
      <div className={styles.toolbar}>
        <SearchBox packages={data.packages} onSelect={focusPackage} />

        <div className={styles.segmented} role="group" aria-label="Layout direction">
          {(['LR', 'TB'] as const).map((value) => (
            <button
              key={value}
              type="button"
              className={clsx(styles.segment, direction === value && styles.segmentActive)}
              aria-pressed={direction === value}
              onClick={() => setDirection(value)}
            >
              {value === 'LR' ? 'Left → right' : 'Top → bottom'}
            </button>
          ))}
        </div>

        <fieldset className={styles.edgeToggles}>
          <legend className={styles.srOnly}>Edges</legend>
          <span className={styles.edgeLegend}>
            <span className={clsx(styles.edgeSample, styles.edgeSampleProd)} aria-hidden="true" />
            Prod
          </span>
          {OPTIONAL_KINDS.map(({ kind, label }) => (
            <label key={kind} className={styles.toggle}>
              <input
                type="checkbox"
                checked={shownKinds.has(kind) === true}
                onChange={() => toggleKind(kind)}
              />
              <span
                className={clsx(
                  styles.edgeSample,
                  kind === 'dev' ? styles.edgeSampleDev : styles.edgeSamplePeer
                )}
                aria-hidden="true"
              />
              {label}
            </label>
          ))}
        </fieldset>

        <button type="button" className={styles.reset} onClick={reset}>
          Reset
        </button>
      </div>

      <fieldset className={styles.groups}>
        <legend className={styles.srOnly}>Package groups</legend>
        {groupsInUse.map((group) => (
          <label
            key={group.id}
            className={clsx(
              styles.groupToggle,
              hiddenGroups.has(group.id) === true && styles.groupHidden
            )}
            data-pkg-group={group.id}
          >
            <input
              type="checkbox"
              checked={hiddenGroups.has(group.id) === false}
              onChange={() => toggleGroup(group.id)}
            />
            <span className={styles.swatch} aria-hidden="true" />
            {group.label}
            <span className={styles.groupCount}>{group.count}</span>
          </label>
        ))}
      </fieldset>

      <div className={styles.canvas}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          colorMode={colorMode}
          minZoom={ZOOM_RANGE.min}
          maxZoom={ZOOM_RANGE.max}
          nodesDraggable={false}
          nodesConnectable={false}
          // Keyboard access goes through the search box, not through tabbing over every node.
          nodesFocusable={false}
          elementsSelectable={false}
          attributionPosition="bottom-center"
          onNodeClick={(_, node) => focusPackage(node.id === focus ? null : node.id)}
          onPaneClick={() => focusPackage(null)}
        >
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
          <Controls showInteractive={false} showFitView={false}>
            <ControlButton onClick={() => frame(400)} title="Fit view" aria-label="Fit view">
              <svg viewBox="0 0 32 30" aria-hidden="true">
                <path d="M3.692 4.63c0-.53.4-.938.939-.938h5.215V0H4.708C2.13 0 0 2.054 0 4.63v5.216h3.692V4.631zM27.354 0h-5.2v3.692h5.17c.53 0 .984.4.984.939v5.215H32V4.631A4.624 4.624 0 0027.354 0zm.954 24.83c0 .532-.4.94-.939.94h-5.215v3.768h5.215c2.577 0 4.631-2.13 4.631-4.707v-5.139h-3.692v5.139zm-23.677.94c-.531 0-.939-.4-.939-.94v-5.138H0v5.139c0 2.577 2.13 4.707 4.708 4.707h5.138V25.77H4.631z" />
              </svg>
            </ControlButton>
          </Controls>
          <MiniMap<PackageNodeType>
            pannable
            zoomable
            className={styles.minimap}
            nodeColor={(node) => `var(--pkg-group-${node.data.pkg.group})`}
            nodeStrokeWidth={0}
          />
          {focusedPackage !== undefined && (
            <Panel position="top-right">
              <DetailsPanel
                pkg={focusedPackage}
                groupLabel={groupLabels.get(focusedPackage.group) ?? focusedPackage.group}
                docState={getPackageDocState(data, focusedPackage.name)}
                permalink={data.packageDocs[focusedPackage.name]?.permalink}
                dependencies={uniqueSorted(
                  visibleEdges
                    .filter((edge) => edge.source === focusedPackage.name)
                    .map((edge) => edge.target)
                )}
                dependents={uniqueSorted(
                  visibleEdges
                    .filter((edge) => edge.target === focusedPackage.name)
                    .map((edge) => edge.source)
                )}
                transitive={{
                  dependencies: reachable?.dependencies.size ?? 0,
                  dependents: reachable?.dependents.size ?? 0,
                }}
                onFocus={focusPackage}
                onClose={() => focusPackage(null)}
              />
            </Panel>
          )}
        </ReactFlow>
      </div>

      <p className={styles.hint}>
        Arrows point from a package to its dependencies. Click a package to focus it and open its
        details, click the background to clear the focus.
      </p>
    </div>
  );
}

/** Client-only entry, lazy-loaded by `./index.tsx`. */
export default function GraphExplorer(): ReactNode {
  return (
    <ReactFlowProvider>
      <Explorer />
    </ReactFlowProvider>
  );
}
