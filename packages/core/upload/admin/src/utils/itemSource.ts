import type { DragItemData } from '../types/dnd';

/**
 * Where an item currently lives, regardless of its kind — folders carry their
 * location on `parentId`, files on `folderId`.
 */
export const sourceFolderIdOf = (item: DragItemData): number | null =>
  item.kind === 'folder' ? item.parentId : item.folderId;

/**
 * The one folder every item in a move came from, or `null` when there isn't one.
 *
 * A selection made under a global search can hold items from anywhere, so a move
 * has a nameable source only when the whole set agrees on it. `null` also covers
 * the empty set. Callers pass the result straight to `formatMoveSuccessMessage`,
 * which drops the source from the wording rather than crediting one item's
 * folder to all of them.
 *
 * Note `null` is overloaded on purpose at the *label* level: an item at the
 * Media Library root also has a `null` location, and both cases end up reading
 * as "no folder to name". Use `hasUniformSource` when the difference matters.
 */
export const uniformSourceFolderId = (items: DragItemData[]): number | null => {
  if (!hasUniformSource(items)) {
    return null;
  }

  return sourceFolderIdOf(items[0]);
};

/** Whether every item in the set came from the same folder. False for an empty set. */
export const hasUniformSource = (items: DragItemData[]): boolean => {
  if (items.length === 0) {
    return false;
  }

  const first = sourceFolderIdOf(items[0]);

  return items.every((item) => sourceFolderIdOf(item) === first);
};
