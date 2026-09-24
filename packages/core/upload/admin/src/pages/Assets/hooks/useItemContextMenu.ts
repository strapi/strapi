import { useCallback, useState } from 'react';

import { useAssetSelection } from './useAssetSelection';

import type { CursorPosition } from '../components/CursorAnchoredMenu';
import type { ItemKey } from '../utils/selection';

/**
 * What the menu will act on. `selection` carries no item because it acts on
 * whatever is selected, which the menu reads for itself.
 */
export type ContextMenuTarget = { kind: 'selection' } | { kind: 'item'; key: ItemKey };

export interface ItemContextMenuState {
  position: CursorPosition;
  target: ContextMenuTarget;
}

/**
 * Decides what a right-click on a list item opens, and where.
 *
 * Two outcomes, and which one you get depends only on whether the clicked item
 * is part of a multi-selection:
 *
 * - **In a multi-selection** — the selection menu, acting on all of it. This is
 *   the file-manager behaviour, and the menu leads with the count so what it
 *   will act on is stated before the actions are.
 * - **Anything else** — the selection is replaced by the clicked item and its
 *   own menu opens. That includes right-clicking an *unselected* item while
 *   others are selected: every file manager drops the old selection there, and
 *   the visible deselection is what stops the menu looking like it applies to
 *   items it doesn't. Leaving the old selection highlighted while acting on a
 *   different item is the genuinely confusing state.
 *
 * Kept out of the views so the rule is defined once and can be tested without a
 * grid or a table around it.
 */
export const useItemContextMenu = () => {
  const { isSelected, selectOnly, selectedKeys } = useAssetSelection();
  const [state, setState] = useState<ItemContextMenuState | null>(null);

  const openForItem = useCallback(
    (event: React.MouseEvent, key: ItemKey) => {
      // Only once we know we're handling it — otherwise a right-click we decline
      // to handle would lose the browser's own menu too.
      event.preventDefault();

      const position = { x: event.clientX, y: event.clientY };

      if (isSelected(key) && selectedKeys.size > 1) {
        setState({ position, target: { kind: 'selection' } });
        return;
      }

      // Replace the selection *before* the menu renders, so the highlight has
      // already moved by the time the user reads the menu.
      selectOnly(key);
      setState({ position, target: { kind: 'item', key } });
    },
    [isSelected, selectOnly, selectedKeys]
  );

  const close = useCallback(() => setState(null), []);

  return { contextMenu: state, openForItem, close };
};
