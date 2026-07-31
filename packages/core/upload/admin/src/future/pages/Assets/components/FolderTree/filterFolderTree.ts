import type { FolderNode } from '../../../../../../../shared/contracts/folders';

interface FilterFolderTreeResult {
  nodes: FolderNode[];
  /**
   * Ancestors of a match, which have to be expanded for the match to be
   * reachable.
   */
  expandedIds: number[];
}

/**
 * Prunes the folder tree to nodes that match, or that have a matching
 * descendant, so a match deep in the hierarchy stays reachable with its ancestor
 * chain intact.
 */
export const filterFolderTree = (
  nodes: FolderNode[],
  matches: (name: string) => boolean
): FilterFolderTreeResult => {
  const expandedIds: number[] = [];

  const prune = (candidates: FolderNode[]): FolderNode[] =>
    candidates.reduce<FolderNode[]>((retained, node) => {
      const retainedChildren = prune(node.children ?? []);
      const isMatch = matches(node.name ?? '');

      if (!isMatch && retainedChildren.length === 0) {
        return retained;
      }

      // Only nodes kept for a descendant's sake need force-expanding; a leaf
      // match has nothing to reveal.
      if (retainedChildren.length > 0 && node.id != null) {
        expandedIds.push(node.id);
      }

      retained.push({ ...node, children: retainedChildren });

      return retained;
    }, []);

  return { nodes: prune(nodes), expandedIds };
};
