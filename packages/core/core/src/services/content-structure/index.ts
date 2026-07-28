import { join } from 'path';
import fse from 'fs-extra';

import type { Core, Modules, UID } from '@strapi/types';
import { isGroupExpressionValid } from './utils/isGroupExpressionValid';

export const CONTENT_STRUCTURE_FILE_NAME = 'groups.json';

export const MAX_FOLDER_DEPTH = 3;

export interface ContentStructureService {
  /**
   * Reads the contents of groups.json directly with minimal sanitization.
   */
  read(): Promise<Modules.ContentStructure.ContentStructureFile | null>;

  /**
   * Yields an extremely tolerant version of the groups configuration file. Invalid references are repaired or ignored. Warnings fire for each repair/omission.
   */
  getCleanedFile(): Promise<Modules.ContentStructure.ContentStructureFile | null>;

  /**
   *  Returns the groups configuration transformed into nested trees.
   */
  resolve(): Promise<Modules.ContentStructure.ResolvedContentStructure>;

  /**
   * Writes a new config and invalidates the cache. Does NOT perform validation - this is
   * left to the caller. The Save that triggers the write restarts the server via the
   * standard update-schema flow, which reloads the file; this method only persists it.
   */
  write(structure: Modules.ContentStructure.ContentStructureFile): Promise<void>;

  /**
   * Invalidates the cached parsed groups.json file.
   */
  invalidate(): void;

  /**
   * Total number of groups across both sections of the cleaned file.
   */
  countGroups(): Promise<number>;
}

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

type ContentStructureCache = Promise<{
  cleaned: Modules.ContentStructure.ContentStructureFile | null;
  resolved: Modules.ContentStructure.ResolvedContentStructure;
}>;

export function createContentStructureService(strapi: Core.Strapi): ContentStructureService {
  /**
   * This cache exists to ensure all consumers recieve the same cleaned+resolved data, regardless of call order / invocation relative to the strapi reload.
   */
  let cache: ContentStructureCache | undefined;

  const getFilePath = () => {
    return join(strapi.dirs.app.contentStructure, CONTENT_STRUCTURE_FILE_NAME);
  };

  const warn = (message: string) => {
    strapi.log.warn(`[content-structure] ${message}`);
  };

  const cleanSection = (
    rawSection: unknown,
    sectionKey: Modules.ContentStructure.ContentStructureSectionKey
  ): Modules.ContentStructure.ContentStructureSection => {
    const rawGroups = (() => {
      if (rawSection === undefined || rawSection === null) {
        return [];
      }

      if (!isRecord(rawSection) || !Array.isArray(rawSection.groups)) {
        warn(`Section "${sectionKey}" is malformed; ignoring it`);
        return [];
      }

      return rawSection.groups;
    })();

    const seenGroupIds = new Map<string, Modules.ContentStructure.ContentStructureGroup>();
    const groups: Modules.ContentStructure.ContentStructureGroup[] = [];

    for (const raw of rawGroups) {
      if (!isGroupExpressionValid(raw)) {
        warn(`Dropping a malformed group entry in section "${sectionKey}"`);
        continue;
      }

      if (raw.name.trim() === '') {
        warn(`Dropping group "${raw.id}" in section "${sectionKey}": empty name`);
        continue;
      }

      if (seenGroupIds.has(raw.id)) {
        warn(`Dropping duplicate group id "${raw.id}" in section "${sectionKey}"`);
        continue;
      }

      const group: Modules.ContentStructure.ContentStructureGroup = {
        children: raw.children as Modules.ContentStructure.ContentStructureChild[],
        parent: raw.parent,
        name: raw.name,
        id: raw.id,
      };

      seenGroupIds.set(group.id, group);
      groups.push(group);
    }

    const reparentToRoot = (
      group: Modules.ContentStructure.ContentStructureGroup,
      reason: string
    ) => {
      group.parent = null;

      groups.splice(groups.indexOf(group), 1);
      groups.push(group);

      warn(`Reparenting group "${group.id}" in section "${sectionKey}" to root: ${reason}`);
    };

    for (const group of [...groups]) {
      if (group.parent !== null && !seenGroupIds.has(group.parent)) {
        reparentToRoot(group, `parent "${group.parent}" does not exist`);
      }
    }

    for (const group of [...groups]) {
      const chain = new Set([group.id]);
      let current = group;

      while (current.parent !== null) {
        if (chain.has(current.parent)) {
          reparentToRoot(group, 'its parent chain contains a cycle');
          break;
        }

        chain.add(current.parent);
        current = seenGroupIds.get(current.parent)!;
      }
    }

    for (const group of [...groups]) {
      let current = group;
      let depth = 1;

      while (current.parent !== null) {
        current = seenGroupIds.get(current.parent)!;
        depth += 1;
      }

      if (depth > MAX_FOLDER_DEPTH) {
        reparentToRoot(group, `it exceeds the maximum nesting depth of ${MAX_FOLDER_DEPTH}`);
      }
    }

    const expectedKind = sectionKey === 'collectionTypes' ? 'collectionType' : 'singleType';
    const seenGroupChildren = new Set<string>();
    const seenUids = new Set<string>();

    for (const group of groups) {
      const cleanedChildren: Modules.ContentStructure.ContentStructureChild[] = [];

      for (const entry of group.children) {
        if (!isRecord(entry)) {
          warn(`Dropping a malformed child entry of group "${group.id}"`);
          continue;
        }

        if (entry.type === 'contentType') {
          const { uid } = entry;

          if (typeof uid !== 'string') {
            warn(`Dropping a contentType child of group "${group.id}": invalid uid`);
            continue;
          }

          const schema: { kind?: string } | undefined = strapi.contentTypes[uid as UID.ContentType];

          if (!schema) {
            warn(`Dropping unknown content type "${uid}" from group "${group.id}"`);
            continue;
          }

          // kind is optional on schemas; absent means collectionType.
          const kind = schema.kind ?? 'collectionType';

          if (kind !== expectedKind) {
            warn(
              `Dropping content type "${uid}" from group "${group.id}": its kind "${kind}" does not belong in section "${sectionKey}"`
            );
            continue;
          }

          if (seenUids.has(uid)) {
            warn(`Dropping duplicate reference to content type "${uid}" from group "${group.id}"`);
            continue;
          }

          cleanedChildren.push({ type: 'contentType', uid: uid as UID.ContentType });
          seenUids.add(uid);
          continue;
        }

        if (entry.type === 'group') {
          const { id } = entry;

          if (typeof id !== 'string') {
            warn(`Dropping a group child of group "${group.id}": invalid id`);
            continue;
          }

          const target = seenGroupIds.get(id);

          if (!target || target.parent !== group.id) {
            warn(`Dropping group child "${id}" from group "${group.id}": inconsistent reference`);
            continue;
          }

          if (seenGroupChildren.has(id)) {
            warn(`Dropping duplicate group child "${id}" from group "${group.id}"`);
            continue;
          }

          cleanedChildren.push({ type: 'group', id });
          seenGroupChildren.add(id);
          continue;
        }

        warn(`Dropping a child entry of group "${group.id}" with an unknown type`);
      }

      group.children = cleanedChildren;
    }

    for (const group of groups) {
      if (group.parent !== null && !seenGroupChildren.has(group.id)) {
        const parent = seenGroupIds.get(group.parent)!;

        parent.children.push({ type: 'group', id: group.id });
        seenGroupChildren.add(group.id);

        warn(
          `Group "${group.id}" was missing from the children of its parent "${parent.id}"; appended it`
        );
      }
    }

    return { groups };
  };

  const resolveSection = (
    section: Modules.ContentStructure.ContentStructureSection
  ): Modules.ContentStructure.ResolvedGroupNode[] => {
    const byId = new Map(section.groups.map((group) => [group.id, group]));

    const toNode = (
      group: Modules.ContentStructure.ContentStructureGroup
    ): Modules.ContentStructure.ResolvedGroupNode => {
      const cleanedChildren = group.children.map(
        (entry): Modules.ContentStructure.ResolvedStructureChild => {
          if (entry.type === 'contentType') {
            return { type: 'contentType', uid: entry.uid };
          }

          return toNode(byId.get(entry.id)!);
        }
      );

      return {
        children: cleanedChildren,
        name: group.name,
        type: 'group',
        id: group.id,
      };
    };

    return section.groups.filter((group) => group.parent === null).map(toNode);
  };

  async function read(): Promise<Modules.ContentStructure.ContentStructureFile | null> {
    const filePath = getFilePath();

    if (!(await fse.pathExists(filePath))) {
      return null;
    }

    let parsed: unknown;
    try {
      parsed = await fse.readJSON(filePath);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      strapi.log.error(
        `[content-structure] Could not parse ${filePath} (${message}); continuing without content-type folders`
      );

      return null;
    }

    if (!isRecord(parsed) || !isRecord(parsed.sections)) {
      strapi.log.error(
        `[content-structure] ${filePath} is not an object with a "sections" property; continuing without content-type folders`
      );
      return null;
    }

    if (parsed.version !== 1) {
      strapi.log.error(
        `[content-structure] Unknown version "${parsed.version}" in ${filePath} (expected 1); continuing without content-type folders`
      );
      return null;
    }

    return parsed as unknown as Modules.ContentStructure.ContentStructureFile;
  }

  const load = () => {
    if (!cache) {
      cache = (async () => {
        const file = await read();

        if (!file) {
          return { cleaned: null, resolved: { collectionTypes: [], singleTypes: [] } };
        }

        const cleaned: Modules.ContentStructure.ContentStructureFile = {
          version: 1,
          sections: {
            collectionTypes: cleanSection(file.sections.collectionTypes, 'collectionTypes'),
            singleTypes: cleanSection(file.sections.singleTypes, 'singleTypes'),
          },
        };

        return {
          cleaned,
          resolved: {
            collectionTypes: resolveSection(cleaned.sections.collectionTypes),
            singleTypes: resolveSection(cleaned.sections.singleTypes),
          },
        };
      })();
    }

    return cache;
  };

  function invalidate() {
    cache = undefined;
  }

  async function getCleanedFile() {
    return (await load()).cleaned;
  }

  async function resolve() {
    return (await load()).resolved;
  }

  async function write(structure: Modules.ContentStructure.ContentStructureFile) {
    const dir = strapi.dirs.app.contentStructure;

    await fse.ensureDir(dir);
    await fse.writeJSON(
      join(dir, CONTENT_STRUCTURE_FILE_NAME),
      { ...structure, version: 1 },
      { spaces: 2 }
    );

    invalidate();
  }

  async function countGroups() {
    const { cleaned } = await load();

    if (!cleaned) {
      return 0;
    }

    const collectionTypesCount = cleaned.sections.collectionTypes.groups.length;
    const singleTypesCount = cleaned.sections.singleTypes.groups.length;

    return collectionTypesCount + singleTypesCount;
  }

  return {
    getCleanedFile,
    countGroups,
    invalidate,
    resolve,
    write,
    read,
  };
}
