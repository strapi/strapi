import type { FolderTreeNode } from './buildFolderTree';

export type FlatItem = {
  parentId: string | null;
  node: FolderTreeNode;
  collapsed: boolean;
  depth: number;
  id: string;
};

export const itemId = (node: FolderTreeNode): string => {
  return node.type === 'folder' ? `folder:${node.id}` : `ct:${node.uid}`;
};

/**
 * Flatten a contentStructure tree into visible, ordered rows. Descendants of a collapsed folder are omitted.
 */
export function flattenSortableTree(
  nodes: FolderTreeNode[],
  collapsed: Set<string>,
  parentId: string | null = null,
  depth = 0
): FlatItem[] {
  const result: FlatItem[] = [];

  for (const node of nodes) {
    if (node.type === 'folder') {
      const isCollapsed = collapsed.has(node.id);
      result.push({ id: itemId(node), node, depth, parentId, collapsed: isCollapsed });

      const flattenedTree = flattenSortableTree(node.children, collapsed, node.id, depth + 1);
      if (!isCollapsed) {
        result.push(...flattenedTree);
      }

      continue;
    }

    result.push({ id: itemId(node), node, depth, parentId, collapsed: false });
  }

  return result;
}

/**
 * Return a contentStructure without the active element's children.
 * This is used to hide a dragged folder's descendants so it can't be dropped into its own subtree.
 */
export function removeSubtree(items: FlatItem[], activeId: string): FlatItem[] {
  const active = items.find((item) => item.id === activeId);

  if (!active || active.node.type !== 'folder') {
    return items;
  }

  const excluded = new Set<string>([activeId]);

  return items.filter((item) => {
    if (item.id === activeId) {
      return true;
    }

    if (item.parentId && excluded.has(`folder:${item.parentId}`)) {
      excluded.add(item.id);
      return false;
    }

    return true;
  });
}
