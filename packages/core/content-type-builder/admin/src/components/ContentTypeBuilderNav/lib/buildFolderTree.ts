import { MAX_FOLDER_DEPTH } from '../../DataManager/utils/contentStructure';

import type { Status } from '../../../types';
import type {
  ContentStructureSection,
  GroupStatus,
} from '../../DataManager/utils/contentStructure';
import type { UID } from '@strapi/types';

export type ContentTypeLink = {
  uid: UID.ContentType;
  to: string;
  title: string;
  status: Status;
};

export type FolderNode = {
  type: 'folder';
  id: string;
  name: string;
  status: GroupStatus;
  depth: number;
  parentId: string | null;
  children: FolderTreeNode[];
};

export type ContentTypeNode = {
  type: 'contentType';
  uid: UID.ContentType;
  to: string;
  title: string;
  status: Status;
  depth: number;
  parentId: string | null;
};

export type FolderTreeNode = FolderNode | ContentTypeNode;

export function buildSectionTree(
  section: ContentStructureSection,
  links: ContentTypeLink[],
  compareTitle: (a: string, b: string) => number
): FolderTreeNode[] {
  const groups = section.groups;

  const groupById = new Map(groups.map((group) => [group.id, group]));
  const linkByUid = new Map(links.map((link) => [link.uid, link]));

  const childGroupIds = new Set<string>();

  for (const group of groups) {
    for (const child of group.children) {
      if (child.type === 'group') {
        childGroupIds.add(child.id);
      }
    }
  }

  const grouped = new Set<UID.ContentType>();

  const buildFolder = (
    group: ContentStructureSection['groups'][number],
    depth: number
  ): FolderNode => {
    const children: FolderTreeNode[] = [];

    for (const child of group.children) {
      if (child.type === 'group') {
        const subGroup = groupById.get(child.id);

        if (!subGroup) {
          continue;
        }

        children.push(buildFolder(subGroup, depth + 1));
        continue;
      }

      const link = linkByUid.get(child.uid);

      if (!link) {
        continue;
      }

      grouped.add(child.uid);

      children.push({
        type: 'contentType',
        status: link.status,
        parentId: group.id,
        title: link.title,
        depth: depth + 1,
        uid: link.uid,
        to: link.to,
      });
    }

    return {
      type: 'folder',
      parentId: group.parent,
      status: group.status,
      name: group.name,
      id: group.id,
      children,
      depth,
    };
  };

  const rootFolders = groups
    .filter((group) => !childGroupIds.has(group.id))
    .map((group) => buildFolder(group, 0));

  const ungrouped = links
    .filter((link) => !grouped.has(link.uid))
    .sort((a, b) => compareTitle(a.title, b.title))
    .map(
      (link): ContentTypeNode => ({
        type: 'contentType',
        status: link.status,
        title: link.title,
        parentId: null,
        uid: link.uid,
        to: link.to,
        depth: 0,
      })
    );

  return [...ungrouped, ...rootFolders];
}

export function filterTree(
  nodes: FolderTreeNode[],
  matches: (text: string) => boolean
): FolderTreeNode[] {
  const result: FolderTreeNode[] = [];

  for (const node of nodes) {
    if (node.type === 'contentType') {
      if (matches(node.title) || matches(node.uid)) {
        result.push(node);
      }

      continue;
    }

    if (matches(node.name)) {
      result.push(node);
      continue;
    }

    const filteredChildren = filterTree(node.children, matches);

    if (filteredChildren.length > 0) {
      result.push({ ...node, children: filteredChildren });
    }
  }

  return result;
}

export function subtreeFolderHeight(folder: FolderNode): number {
  let deepestChild = 0;

  for (const child of folder.children) {
    if (child.type === 'folder') {
      deepestChild = Math.max(deepestChild, subtreeFolderHeight(child));
    }
  }

  return 1 + deepestChild;
}

/**
 * Whether moving `folder` under a target (a folder, or `null` for the section
 * root) would keep the resulting subtree within {@link MAX_FOLDER_DEPTH}.
 */
export function canNestFolderAt(folder: FolderNode, target: FolderNode | null): boolean {
  const targetDomainDepth = target ? target.depth + 1 : 0;
  const deepestResult = targetDomainDepth + subtreeFolderHeight(folder);

  return deepestResult <= MAX_FOLDER_DEPTH;
}

export function countSubtree(
  section: ContentStructureSection,
  folderId: string,
  countableUids: ReadonlySet<UID.ContentType>
): { contentTypes: number; subfolders: number } {
  const groupById = new Map(section.groups.map((group) => [group.id, group]));

  let contentTypes = 0;
  let subfolders = 0;

  const walk = (group: ContentStructureSection['groups'][number]) => {
    for (const child of group.children) {
      if (child.type === 'contentType') {
        if (countableUids.has(child.uid)) {
          contentTypes += 1;
        }

        continue;
      }

      const childGroup = groupById.get(child.id);

      if (!childGroup) {
        continue;
      }

      subfolders += 1;
      walk(childGroup);
    }
  };

  const root = groupById.get(folderId);

  if (root) {
    walk(root);
  }

  return { contentTypes, subfolders };
}

export function collectSubtreeContentTypeUids(
  section: ContentStructureSection,
  folderId: string
): UID.ContentType[] {
  const groupById = new Map(section.groups.map((group) => [group.id, group]));
  const uids: UID.ContentType[] = [];

  const walk = (id: string) => {
    const group = groupById.get(id);

    if (!group) {
      return;
    }

    for (const child of group.children) {
      if (child.type === 'contentType') {
        uids.push(child.uid);
        continue;
      }

      walk(child.id);
    }
  };

  walk(folderId);

  return uids;
}

export function indexFolders(nodes: FolderTreeNode[]): Map<string, FolderNode> {
  const index = new Map<string, FolderNode>();

  const walk = (node: FolderTreeNode) => {
    if (node.type !== 'folder') {
      return;
    }

    index.set(node.id, node);
    node.children.forEach(walk);
  };

  nodes.forEach(walk);

  return index;
}
