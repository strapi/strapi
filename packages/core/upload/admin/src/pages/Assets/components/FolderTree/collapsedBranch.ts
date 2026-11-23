import { findFolderPath } from '../../../../utils/findFolderPath';

import type { FolderNode } from '../../../../../../shared/contracts/folders';

/**
 * Depth (0 = a root folder) from which the selected folder's ancestors fold into
 * a single "N parent folders" row in the sidebar. Picked so the deepest visible
 * row still has room for a readable name in the 23.2rem rail.
 */
export const COLLAPSE_FROM_DEPTH = 4;

export interface CollapsedBranch {
  root: FolderNode;
  /** Between `root` and `parent`, shallowest first. */
  hidden: FolderNode[];
  /** The selected folder's parent. */
  parent: FolderNode;
}

/**
 * How the selected folder's branch folds once it is deep enough: the root stays,
 * everything between the root and the parent is hidden, and the parent stays so
 * the selected folder is shown alongside its siblings. `null` means the branch
 * renders in full.
 */
export const getCollapsedBranch = (
  nodes: FolderNode[],
  selectedId: number | null
): CollapsedBranch | null => {
  if (selectedId == null) {
    return null;
  }

  const path = findFolderPath(nodes, selectedId);
  if (!path || path.length - 1 < COLLAPSE_FROM_DEPTH) {
    return null;
  }

  return {
    root: path[0],
    hidden: path.slice(1, -2),
    parent: path[path.length - 2],
  };
};
