import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import fs from 'fs-extra';

export type FolderSelection = { targetGroupId: string } | { newFolderName: string };

export interface FolderChoice {
  value: string;
  name: string;
}

export type ContentStructureReadResult =
  | { status: 'ok'; file: any }
  | { status: 'invalid' }
  | { status: 'absent' };

export const getContentStructureFilePath = (destBasePath: string): string => {
  return join(destBasePath, 'content-structure', 'groups.json');
};

const isRecord = (value: any): boolean => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

export const readContentStructureFile = (destBasePath: string): ContentStructureReadResult => {
  const filePath = getContentStructureFilePath(destBasePath);

  if (!fs.pathExistsSync(filePath)) {
    return { status: 'absent' };
  }

  let parsed: any;

  try {
    parsed = fs.readJSONSync(filePath);
  } catch {
    return { status: 'invalid' };
  }

  if (!isRecord(parsed) || parsed.version !== 1 || !isRecord(parsed.sections)) {
    return { status: 'invalid' };
  }

  return { status: 'ok', file: parsed };
};

export const sectionKeyForKind = (kind: string): 'collectionTypes' | 'singleTypes' => {
  return kind === 'singleType' ? 'singleTypes' : 'collectionTypes';
};

const isWellFormedGroup = (group: any): boolean => {
  if (!isRecord(group)) {
    return false;
  }

  if (typeof group.id !== 'string' || group.id.length === 0) {
    return false;
  }

  if (typeof group.name !== 'string' || group.name.trim().length === 0) {
    return false;
  }

  if (group.parent !== null && typeof group.parent !== 'string') {
    return false;
  }

  return Array.isArray(group.children);
};

export const getSectionGroups = (file: any, sectionKey: string): any[] | null => {
  const section = file.sections[sectionKey];

  if (section === undefined || section === null) {
    return [];
  }

  if (!isRecord(section) || !Array.isArray(section.groups)) {
    return null;
  }

  return section.groups;
};

const isGroupChild = (child: any): boolean => {
  return isRecord(child) && child.type === 'group' && typeof child.id === 'string';
};

/**
 * A group is an effective root when it has no parent, or its parent id points
 * at a group that no longer exists.
 */
const isEffectivelyRoot = (group: any, knownIds: Set<string>): boolean => {
  return group.parent === null || !knownIds.has(group.parent);
};

export const listFolderChoices = (groups: any[]): FolderChoice[] => {
  const wellFormed = groups.filter(isWellFormedGroup);

  const choices: FolderChoice[] = [];
  const seen = new Set<string>();

  const byId = new Map<string, any>();

  for (const group of wellFormed) {
    if (byId.has(group.id)) continue;
    byId.set(group.id, group);
  }

  const knownIds = new Set(byId.keys());

  const childGroupsOf = (parent: any): any[] => {
    const listed = parent.children
      .filter(isGroupChild)
      .map((child: any) => {
        return byId.get(child.id);
      })
      .filter((group: any) => {
        return group !== undefined && group.parent === parent.id;
      });

    const unlisted = wellFormed.filter((group) => {
      return group.parent === parent.id && !listed.includes(group);
    });

    return [...listed, ...unlisted];
  };

  const visit = (parent: any, path: string[]) => {
    const children = (() => {
      if (parent !== null) {
        return childGroupsOf(parent);
      }

      return wellFormed.filter((group) => {
        return isEffectivelyRoot(group, knownIds);
      });
    })();

    for (const group of children) {
      if (seen.has(group.id)) {
        continue;
      }

      seen.add(group.id);

      const groupPath = [...path, group.name];
      choices.push({ name: groupPath.join(' / '), value: group.id });

      visit(group, groupPath);
    }
  };

  visit(null, []);

  return choices;
};

/**
 * Groups whose parent id does not exist are considered root level entries.
 */
export const findRootFolderByName = (groups: any[], name: string): any => {
  const target = name.trim().toLowerCase();

  if (target.length === 0) {
    return undefined;
  }

  const knownIds = new Set(groups.filter(isWellFormedGroup).map(({ id }) => id));

  return groups.find((group) => {
    if (!isWellFormedGroup(group)) {
      return false;
    }

    if (!isEffectivelyRoot(group, knownIds)) {
      return false;
    }

    return group.name.trim().toLowerCase() === target;
  });
};

export const generateFolderId = (): string => {
  const body = randomUUID().replace(/-/g, '').slice(0, 24);
  return `grp_${body}`;
};

const createEmptyContentStructureFile = () => {
  return {
    version: 1,
    sections: {
      collectionTypes: { groups: [] },
      singleTypes: { groups: [] },
    },
  };
};

const ensureSectionGroups = (file: any, sectionKey: string): any[] | null => {
  const section = file.sections[sectionKey];

  if (section === undefined || section === null) {
    file.sections[sectionKey] = { groups: [] };
    return file.sections[sectionKey].groups;
  }

  if (!isRecord(section) || !Array.isArray(section.groups)) {
    return null;
  }

  return section.groups;
};

const resolveTargetGroup = (groups: any[], folder: FolderSelection): any => {
  if ('targetGroupId' in folder) {
    const target = groups.find((group) => {
      return isWellFormedGroup(group) && group.id === folder.targetGroupId;
    });

    if (!target) {
      throw new Error(`No usable folder with id "${folder.targetGroupId}" exists in groups.json.`);
    }

    return target;
  }

  const hasUsableName = typeof folder.newFolderName === 'string';
  const name = hasUsableName ? folder.newFolderName.trim() : '';

  if (name.length === 0) {
    throw new Error('The new folder name must be a non-empty string.');
  }

  const existingRootFolder = findRootFolderByName(groups, name);

  if (existingRootFolder) {
    return existingRootFolder;
  }

  const created = {
    id: generateFolderId(),
    children: [],
    parent: null,
    name,
  };

  groups.push(created);

  return created;
};

const removeContentTypeFromSection = (groups: any[], uid: string): void => {
  for (const group of groups) {
    if (!isWellFormedGroup(group)) {
      continue;
    }

    group.children = group.children.filter((child: any) => {
      if (!isRecord(child)) {
        return true;
      }

      return !(child.type === 'contentType' && child.uid === uid);
    });
  }
};

export interface AssignContentTypeToFolderOptions {
  folder: FolderSelection;
  destBasePath: string;
  kind: string;
  uid: string;
}

/**
 * Validates the folder selection and stages the assignment of a content type in
 * `<destBasePath>/content-structure/groups.json`, creating the file (or a new root
 * folder) in memory when needed.
 *
 * @return A commit function that writes the staged result to disk.
 */
export const planContentTypeToFolder = (
  options: AssignContentTypeToFolderOptions
): (() => void) => {
  const { destBasePath, kind, uid, folder } = options;
  const filePath = getContentStructureFilePath(destBasePath);

  const read = readContentStructureFile(destBasePath);

  if (read.status === 'invalid') {
    throw new Error(
      `Cannot assign "${uid}" to a folder: ${filePath} exists but is not a valid content-structure file.`
    );
  }

  const file = read.status === 'ok' ? read.file : createEmptyContentStructureFile();

  const sectionKey = sectionKeyForKind(kind);
  const groups = ensureSectionGroups(file, sectionKey);

  if (groups === null) {
    throw new Error(
      `Cannot assign "${uid}" to a folder: the "${sectionKey}" section of ${filePath} is malformed.`
    );
  }

  const targetGroup = resolveTargetGroup(groups, folder);

  removeContentTypeFromSection(groups, uid);
  targetGroup.children.push({ type: 'contentType', uid });

  return () => {
    fs.outputJSONSync(filePath, file, { spaces: 2 });
  };
};
