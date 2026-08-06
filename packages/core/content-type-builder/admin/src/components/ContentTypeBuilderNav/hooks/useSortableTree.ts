import { useCallback, useRef, useState } from 'react';

import { closestCenter, PointerSensor, pointerWithin, useSensor, useSensors } from '@dnd-kit/core';

import { resolveDropTarget } from '../lib/dropProjection';
import { removeSubtree } from '../lib/flatModel';

import type { FolderTreeNode } from '../lib/buildFolderTree';
import type { DropTarget } from '../lib/dropProjection';
import type { FlatItem } from '../lib/flatModel';
import type {
  CollisionDetection,
  DragMoveEvent,
  DragStartEvent,
  SensorDescriptor,
} from '@dnd-kit/core';
import type { SortingStrategy } from '@dnd-kit/sortable';

// How long the pointer must dwell over a closed folder's nest zone before it
// springs open, letting you drop deeper.
const SPRING_OPEN_MS = 700;

/** The insertion line to paint, plus the depth its left edge indents to. */
export type DropLine = { anchorId: string; edge: 'top' | 'bottom'; depth: number };

interface UseSortableTreeOptions {
  /** Commit a drop. Called only for a real move, with the node and its resolved target. */
  onDrop: (activeNode: FolderTreeNode, target: DropTarget) => void;
  /** Spring-open a closed folder held under the pointer, so the user can drop deeper. */
  onExpandFolder: (folderId: string) => void;
  /** Ids of collapsed folders — used to tell a closed folder (springs open) from an empty one. */
  collapsed: Set<string>;
  /** When true the contentStructure tree is read-only. */
  disabled: boolean;
  /** The full flattened, visible tree (descendants of collapsed folders omitted). */
  items: FlatItem[];
}

export interface UseSortableTreeResult {
  collisionDetection: CollisionDetection;
  sensors: SensorDescriptor<object>[];
  sortingStrategy: SortingStrategy;
  /** The items to render (the dragged folder's descendants are hidden mid-drag). */
  renderedItems: FlatItem[];
  /** The row being dragged, or null. */
  activeItem: FlatItem | null;
  /** Folder row (by dnd id) to highlight as the nest target — no line is drawn for it. */
  dropTargetId: string | null;
  /** The insertion line to paint, or null when nesting into a highlighted folder. */
  dropLine: DropLine | null;
  onDragStart: (event: DragStartEvent) => void;
  onDragMove: (event: DragMoveEvent) => void;
  onDragCancel: () => void;
  onDragEnd: () => void;
}

type SpringRef = { folderId: string | null; timer?: ReturnType<typeof setTimeout> };

const useHoverFolderOpen = (onExpandFolder: (folderId: string) => void) => {
  const springRef = useRef<SpringRef>({ folderId: null });

  const cancelFolderOpen = () => {
    clearTimeout(springRef.current.timer);
    springRef.current = { folderId: null };
  };

  // Arm (once per folder) a timer that springs the closed folder open after a
  // dwell, so the user can drop into a deeper level.
  const scheduleFolderOpen = (folderId: string) => {
    if (springRef.current.folderId === folderId) {
      return;
    }

    cancelFolderOpen();
    springRef.current.folderId = folderId;

    springRef.current.timer = setTimeout(() => {
      onExpandFolder(folderId);
      springRef.current.folderId = null;
    }, SPRING_OPEN_MS);
  };

  return { scheduleFolderOpen, cancelFolderOpen };
};

/**
 * The drag-and-drop engine for a flattened folder tree: it owns the drag state
 * machine, pointer-vs-row geometry, spring-open timers and drop projection, and
 * returns the props a `DndContext` + `SortableContext` need plus the resolved
 * drop indicator. It carries no domain logic — nesting rules, the move itself,
 * and expansion are supplied by the caller through {@link UseSortableTreeOptions}.
 */
export const useSortableTree = ({
  onExpandFolder,
  collapsed,
  disabled,
  onDrop,
  items,
}: UseSortableTreeOptions): UseSortableTreeResult => {
  const [projected, setProjected] = useState<DropTarget | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  const pointerRef = useRef<{ x: number; y: number } | null>(null);
  const { scheduleFolderOpen, cancelFolderOpen } = useHoverFolderOpen(onExpandFolder);

  const collisionDetection = useCallback<CollisionDetection>((args) => {
    // Captured here (onDragMove has no pointer position) to decide whether the
    // pointer sits over a folder's nest zone (its middle third).
    pointerRef.current = args.pointerCoordinates;

    // Resolve `over` from the pointer, NOT the drag overlay's centre. dnd-kit
    // keeps the grab point under the cursor, so the overlay centre sits up to
    // half a row from the pointer depending on where the row was picked up; with
    // closest-centre, `over` and the pointer-based nest-zone check then disagree
    // and nesting into a folder misfires. Fall back to closest-centre only when
    // the pointer is outside every row (the list's padding / edges). A static
    // list keeps both results stable, so no hysteresis is needed.
    const withinPointer = pointerWithin(args);
    return withinPointer.length > 0 ? withinPointer : closestCenter(args);
  }, []);

  // While dragging a folder, its descendents are hidden so it cannot nest in itself.
  const renderedItems = activeId ? removeSubtree(items, activeId) : items;
  const activeItem = items.find((item) => item.id === activeId) ?? null;

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const onDragStart = (event: DragStartEvent) => {
    if (disabled) {
      return;
    }

    cancelFolderOpen();
    setActiveId(String(event.active.id));
    setProjected(null);
  };

  const onDragCancel = () => {
    resetDrag();
  };

  const onDragMove = (event: DragMoveEvent) => {
    if (!activeId || !event.over) {
      return;
    }

    const target = resolveDropTarget(renderedItems, {
      pointer: pointerRef.current ?? undefined,
      overId: String(event.over.id),
      overRect: event.over.rect,
      offsetX: event.delta.x,
      activeId,
    });

    setProjected(target);

    if (target?.kind === 'nest' && collapsed.has(target.folderId)) {
      scheduleFolderOpen(target.folderId);
    } else {
      cancelFolderOpen();
    }
  };

  const resetDrag = () => {
    cancelFolderOpen();
    setActiveId(null);
    setProjected(null);
  };

  const onDragEnd = () => {
    if (disabled) {
      return;
    }

    const item = activeItem;
    const target = projected;

    resetDrag();

    if (!item || !target) {
      return;
    }

    onDrop(item.node, target);
  };

  const dropLine =
    projected?.kind === 'insert' && projected.line
      ? { ...projected.line, depth: projected.depth }
      : null;

  const dropTargetId = projected?.kind === 'nest' ? `folder:${projected.folderId}` : null;

  const sortingStrategy: SortingStrategy = () => null;

  return {
    collisionDetection,
    sortingStrategy,
    renderedItems,
    dropTargetId,
    activeItem,
    dropLine,
    sensors,
    onDragCancel,
    onDragStart,
    onDragMove,
    onDragEnd,
  };
};
