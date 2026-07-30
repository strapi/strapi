import type { FolderNode } from '../../../../shared/contracts/folders';

export interface FlatFolderOption {
  id: number;
  /** Full ancestry label, e.g. "About / Images". */
  label: string;
}

/**
 * Flattens the nested folder structure (`/upload/folder-structure`) into a
 * depth-first list of `{ id, label }` options where the label carries the full
 * ancestry path. Used by destination selects so folders sharing a name stay
 * distinguishable ("About / Images" vs "Tech / Images"), with children listed
 * right under their parent.
 *
 * `excludeSubtreeIds` prunes a folder *and everything below it* in the same
 * single pass — used to drop the selected folders (and their descendants) from
 * bulk-move destinations without re-walking the tree per option.
 */
export const flattenFolderStructure = (
  nodes: FolderNode[],
  excludeSubtreeIds: ReadonlySet<number> = new Set(),
  parentLabel = ''
): FlatFolderOption[] =>
  nodes.flatMap((node) => {
    if (node.id == null || excludeSubtreeIds.has(node.id)) {
      return [];
    }

    const label = parentLabel ? `${parentLabel} / ${node.name ?? ''}` : (node.name ?? '');

    return [
      { id: node.id, label },
      ...flattenFolderStructure(node.children ?? [], excludeSubtreeIds, label),
    ];
  });
