import type { FolderNode } from '../../../../shared/contracts/folders';

/**
 * Leaf display name for a folder id. `null` (root) → the Media Library label.
 * Used by both the DnD success toast and the dialog success toast so the two
 * paths name folders identically. Ancestry paths belong only in the dialog's
 * select options (see `flattenFolderStructure`).
 *
 * `id === null` returns `rootLabel`; an unknown id falls back to `rootLabel`
 * too (defensive — mirrors the dialog's previous `?? rootLabel`).
 */
export const getFolderLabel = (
  folderStructure: FolderNode[],
  id: number | null,
  rootLabel: string
): string => {
  if (id === null) {
    return rootLabel;
  }

  const findNode = (nodes: FolderNode[]): FolderNode | null => {
    for (const node of nodes) {
      if (node.id === id) {
        return node;
      }

      const found = findNode(node.children ?? []);
      if (found) {
        return found;
      }
    }

    return null;
  };

  return findNode(folderStructure)?.name ?? rootLabel;
};
