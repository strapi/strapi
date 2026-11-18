import type { FolderNode } from '../../../shared/contracts/folders';

/**
 * The chain of folders from the library root down to `targetId`, inclusive, or
 * `null` when the folder is not in the tree (deleted, or not loaded yet).
 */
export const findFolderPath = (
  nodes: FolderNode[],
  targetId: number,
  trail: FolderNode[] = []
): FolderNode[] | null => {
  for (const node of nodes) {
    const nextTrail = node.id != null ? [...trail, node] : trail;

    if (node.id === targetId) {
      return nextTrail;
    }

    if (node.children?.length) {
      const found = findFolderPath(node.children, targetId, nextTrail);

      if (found !== null) {
        return found;
      }
    }
  }

  return null;
};
