import {
  createContext,
  useContext,
  type CSSProperties,
  type KeyboardEvent,
  type SyntheticEvent,
} from 'react';

import type { DraggableAttributes, DraggableSyntheticListeners } from '@dnd-kit/core';

/**
 * What a list item needs to take part in reordering: the whole item drags with
 * the pointer, and a grip button carries the keyboard path (Space to pick up,
 * arrows to move) so it doesn't collide with the item's own Space/click.
 */
export interface AssetSortable {
  setNodeRef: (node: HTMLElement | null) => void;
  isDragging: boolean;
  style: CSSProperties;
  /** Pointer activation, for the item itself. */
  listeners: DraggableSyntheticListeners;
  handle: Partial<DraggableAttributes> & {
    ref: (node: HTMLElement | null) => void;
    onKeyDown?: (event: KeyboardEvent) => void;
  };
}

type UseAssetSortable = (assetId: number) => AssetSortable | null;

const useNotSortable: UseAssetSortable = () => null;

/**
 * Holds the hook that makes an asset sortable, rather than a value: the hook
 * needs each item's id. A given subtree always gets the same hook, so calling
 * it from `useAssetSortable` keeps the rules of hooks.
 */
export const AssetSortableContext = createContext<UseAssetSortable>(useNotSortable);

export const useAssetSortable = (assetId: number) => {
  const useSortableAsset = useContext(AssetSortableContext);

  return useSortableAsset(assetId);
};

const REORDER_HANDLE_ATTRIBUTE = 'data-reorder-handle';

/** Marks the reorder grip, so the item can tell its keys apart. */
export const REORDER_HANDLE_PROPS = { [REORDER_HANDLE_ATTRIBUTE]: '' };

/**
 * Keys pressed on the grip, including the arrows and the drop key mid-drag,
 * belong to reordering. The item must not also read them as its own
 * Enter/Space.
 */
export const isFromReorderHandle = (event: SyntheticEvent) =>
  event.target instanceof Element && event.target.closest(`[${REORDER_HANDLE_ATTRIBUTE}]`) !== null;
