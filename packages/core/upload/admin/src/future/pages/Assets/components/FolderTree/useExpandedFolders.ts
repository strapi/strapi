import { useEffect, useState, useCallback } from 'react';

import type { FolderNode } from '../../../../../../../shared/contracts/folders';

/**
 * Walk the structure and return the chain of ancestor ids that lead to
 * `targetId`. Excludes `targetId` itself — we only want the ancestors
 * to be expanded, not the leaf the user is currently sitting on.
 *
 * Returns `null` when the target isn't found in the tree, so the caller
 * can distinguish "found at root with no ancestors" (`[]`) from
 * "not in this branch" (`null`).
 */
const findAncestorIds = (
  nodes: FolderNode[],
  targetId: number,
  trail: number[] = []
): number[] | null => {
  for (const node of nodes) {
    if (node.id === targetId) {
      return trail;
    }

    if (node.children?.length) {
      const nextTrail = node.id != null ? [...trail, node.id] : trail;
      const found = findAncestorIds(node.children, targetId, nextTrail);
      if (found !== null) {
        return found;
      }
    }
  }

  return null;
};

/**
 * Local expand/collapse state for the FolderTree sidebar.
 *
 * Behaviour:
 * - The ancestor chain of `currentFolderId` is auto-expanded whenever the
 *   current folder or the structure changes, so the tree reveals "where am I"
 *   on navigation (deep link, breadcrumb click, etc.).
 * - The user's manual toggles persist on top of that — once a branch has been
 *   expanded (manually or automatically) it stays expanded until the user
 *   collapses it explicitly.
 * - State is intentionally per-mount; we don't persist across reloads so a
 *   fresh page load always shows the natural collapsed tree with only the
 *   active branch open.
 */
export const useExpandedFolders = (
  folderStructure: FolderNode[],
  currentFolderId: number | null
) => {
  const [expandedIds, setExpandedIds] = useState<Set<number>>(() => new Set());

  useEffect(() => {
    if (currentFolderId == null) {
      return;
    }

    const ancestors = findAncestorIds(folderStructure, currentFolderId);
    if (!ancestors || ancestors.length === 0) {
      return;
    }

    setExpandedIds((prev) => {
      const next = new Set(prev);
      let changed = false;
      for (const id of ancestors) {
        if (!next.has(id)) {
          next.add(id);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [folderStructure, currentFolderId]);

  const toggleExpanded = useCallback((id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const isExpanded = useCallback((id: number) => expandedIds.has(id), [expandedIds]);

  return { isExpanded, toggleExpanded };
};
