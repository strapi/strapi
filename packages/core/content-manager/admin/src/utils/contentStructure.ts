import type { Modules } from '@strapi/types';

type ResolvedGroupNode = Modules.ContentStructure.ResolvedGroupNode;
type ResolvedStructureChild = Modules.ContentStructure.ResolvedStructureChild;

export type VisibleTreeNode<TLink> =
  | { type: 'folder'; id: string; name: string; children: VisibleTreeNode<TLink>[] }
  | { type: 'link'; link: TLink };

/**
 * Reconcile a resolved content-structure section (folder groups) with the set of links the user can
 * actually see with respect to their RBAC permissions.
 */
export function deriveVisibleTree<TLink extends { uid: string }>(
  groups: ResolvedGroupNode[],
  links: TLink[],
  compareUngrouped?: (a: TLink, b: TLink) => number
): VisibleTreeNode<TLink>[] {
  const linkByUid = new Map(links.map((link) => [link.uid, link]));
  const grouped = new Set<string>();

  const resolveChildAsNode = (child: ResolvedStructureChild): VisibleTreeNode<TLink> | null => {
    if (child.type === 'contentType') {
      const link = linkByUid.get(child.uid);

      if (!link) {
        return null;
      }

      grouped.add(child.uid);

      return { type: 'link', link };
    }

    return resolveGroupAsNode(child);
  };

  const resolveGroupAsNode = (group: ResolvedGroupNode): VisibleTreeNode<TLink> | null => {
    const children = group.children
      .map(resolveChildAsNode)
      .filter((node): node is VisibleTreeNode<TLink> => {
        return node !== null;
      });

    if (children.length === 0) {
      return null;
    }

    return { type: 'folder', id: group.id, name: group.name, children };
  };

  const folders = groups.map(resolveGroupAsNode).filter((node): node is VisibleTreeNode<TLink> => {
    return node !== null;
  });

  const ungrouped = links.filter((link) => !grouped.has(link.uid));

  if (compareUngrouped) {
    ungrouped.sort(compareUngrouped);
  }

  return [...folders, ...ungrouped.map((link): VisibleTreeNode<TLink> => ({ type: 'link', link }))];
}

export function flattenTreeLinks<TLink>(
  nodes: VisibleTreeNode<TLink>[],
  parentPath: string[] = []
): Array<{ link: TLink; path: string[] }> {
  return nodes.flatMap((node) => {
    if (node.type === 'link') {
      return [{ link: node.link, path: parentPath }];
    }

    return flattenTreeLinks(node.children, [...parentPath, node.name]);
  });
}

export function countTreeLinks<TLink>(nodes: VisibleTreeNode<TLink>[]): number {
  return flattenTreeLinks(nodes).length;
}
