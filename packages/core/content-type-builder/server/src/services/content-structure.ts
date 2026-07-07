import { errors } from '@strapi/utils';

import type { Core, Modules } from '@strapi/types';

const { ApplicationError } = errors;

type ContentStructureGroup = Modules.ContentStructure.ContentStructureGroup;
type ContentStructureFile = Modules.ContentStructure.ContentStructureFile;
type SectionKey = Modules.ContentStructure.ContentStructureSectionKey;
type ContentTypeKind = 'collectionType' | 'singleType';

const SECTION_KEYS: SectionKey[] = ['collectionTypes', 'singleTypes'];

const expectedKindFor = (sectionKey: SectionKey): ContentTypeKind => {
  return sectionKey === 'collectionTypes' ? 'collectionType' : 'singleType';
};

/**
 * A mirror of the subset of the core `content-structure` service (strapi.get('content-structure'))
 * that this service consumes.
 */
export interface CoreContentStructureService {
  getCleanedFile(): Promise<ContentStructureFile | null>;
  write(structure: ContentStructureFile): Promise<void>;
}

/**
 * This service handles the CTB orchestration of folder-group WRITES. It handles:
 * - Context-aware validation that requires the content-type registry
 * - Context-aware pruning of references invalidated by CTB transaction.
 * - Persistence to filesystem via the core content-structure service.
 * It assumes that non-context-aware validation has already been performed.
 */
export interface ContentTypeBuilderContentStructureService {
  /**
   * Validates all references to content types in the provided content structure.
   * Throws an ApplicationError naming every offending uid + rule.
   */
  validateContentTypeUidReferences(
    structure: unknown,
    contentTypeUids: Map<string, ContentTypeKind>
  ): void;

  /**
   * Attempts to persist the provided `incomingStructure` to the `groups.json` file (via the
   * core content-structure service). Prior to invoking the core service, this method:
   * - Prunes references to content types that are deleted or whose kind has changed as a
   *   result of the same save operation.
   * - Validates the pruned structure's references against the effective set of content types
   *   (produced from `createdUids`, `deletedUids`, and the pre-existing registry).
   * Returns true if a file write occurred, false if a write was not necessary.
   * Invokes `validateContentTypeUidReferences()`, which throws an ApplicationError if a
   * referenced contentTypeUid is invalid.
   */
  persistFromUpdate(input: {
    incomingStructure?: unknown;
    createdUids: Map<string, ContentTypeKind>;
    deletedUids: Set<string>;
  }): Promise<boolean>;
}

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

/**
 * Formats a validated ContentStructureFile into a complete `groups.json` file.
 */
const formatContentStructureObjectAsFile = (structure: unknown): ContentStructureFile => {
  const sections = isRecord(structure) && isRecord(structure.sections) ? structure.sections : {};

  // Supplies all record groups with expected fields, so that the reference validator
  // can access `children`/`id` unconditionally.
  const coerceGroup = (raw: Record<string, unknown>): ContentStructureGroup => {
    const childrenArray = (
      Array.isArray(raw.children) ? raw.children : []
    ) as Modules.ContentStructure.ContentStructureChild[];

    return {
      parent: typeof raw.parent === 'string' ? raw.parent : null,
      name: typeof raw.name === 'string' ? raw.name : '',
      id: typeof raw.id === 'string' ? raw.id : '',
      children: childrenArray,
    };
  };

  const coerceSection = (key: SectionKey): Modules.ContentStructure.ContentStructureSection => {
    const raw = (sections as Record<string, unknown>)[key];
    const groups = isRecord(raw) && Array.isArray(raw.groups) ? raw.groups : [];

    return { groups: groups.filter(isRecord).map(coerceGroup) };
  };

  return {
    version: 1,
    sections: {
      collectionTypes: coerceSection('collectionTypes'),
      singleTypes: coerceSection('singleTypes'),
    },
  };
};

const cloneFile = (file: ContentStructureFile): ContentStructureFile => ({
  version: 1,
  sections: {
    collectionTypes: {
      groups: file.sections.collectionTypes.groups.map((group) => ({
        ...group,
        children: [...group.children],
      })),
    },
    singleTypes: {
      groups: file.sections.singleTypes.groups.map((group) => ({
        ...group,
        children: [...group.children],
      })),
    },
  },
});

export function createContentStructureService(
  strapi: Core.Strapi
): ContentTypeBuilderContentStructureService {
  const contentStructureService: CoreContentStructureService = strapi.get('content-structure');

  const warn = (message: string) => {
    strapi.log.warn(`[content-structure] ${message}`);
  };

  /**
   * Builds an effective set of content type uids and their kind by resolving the pre-transaction content type registry with the list of created and deleted uids.
   */
  const buildEffectiveUidKindSet = (
    createdUids: Map<string, ContentTypeKind>,
    deletedUids: Set<string>
  ): Map<string, ContentTypeKind> => {
    const effective = new Map<string, ContentTypeKind>();

    for (const [uid, contentType] of Object.entries(strapi.contentTypes)) {
      effective.set(uid, contentType.kind === 'singleType' ? 'singleType' : 'collectionType');
    }

    for (const uid of deletedUids) {
      effective.delete(uid);
    }

    for (const [uid, kind] of createdUids) {
      effective.set(uid, kind);
    }

    return effective;
  };

  /**
   * Remove references to content types that are deleted or whose kind has changed as a result of the same save operation.
   */
  const pruneStructure = (
    file: ContentStructureFile,
    deletedUids: Set<string>,
    contentTypeKinds: Map<string, ContentTypeKind>
  ): ContentStructureFile => {
    const cloned = cloneFile(file);

    for (const sectionKey of SECTION_KEYS) {
      const expectedKind = expectedKindFor(sectionKey);

      for (const group of cloned.sections[sectionKey].groups) {
        group.children = group.children.filter((child) => {
          if (child.type !== 'contentType') {
            return true;
          }

          const { uid } = child;

          if (deletedUids.has(uid)) {
            warn(`Pruned deleted content type "${uid}" from group "${group.id}"`);
            return false;
          }

          if (contentTypeKinds.has(uid) && contentTypeKinds.get(uid) !== expectedKind) {
            warn(
              `Pruned content type "${uid}" from group "${group.id}": its kind no longer belongs in section "${sectionKey}"`
            );
            return false;
          }

          return true;
        });
      }
    }

    return cloned;
  };

  const validateContentTypeUidReferences = (
    structure: unknown,
    contentTypeKinds: Map<string, ContentTypeKind>
  ): void => {
    const file = formatContentStructureObjectAsFile(structure);
    const violations: string[] = [];

    for (const sectionKey of SECTION_KEYS) {
      const expectedKind = expectedKindFor(sectionKey);

      for (const group of file.sections[sectionKey].groups) {
        for (const child of group.children) {
          if (child.type !== 'contentType') {
            continue;
          }

          const { uid } = child;

          // Referenced content type exists (in the effective set).
          if (!contentTypeKinds.has(uid)) {
            violations.push(
              `Content type "${uid}" in group "${group.id}" does not exist in section "${sectionKey}"`
            );
            continue;
          }

          // Kind matches section.
          if (contentTypeKinds.get(uid) !== expectedKind) {
            violations.push(
              `Content type "${uid}" in group "${group.id}" is a ${contentTypeKinds.get(
                uid
              )} and cannot be placed in section "${sectionKey}"`
            );
          }
        }
      }
    }

    if (violations.length > 0) {
      throw new ApplicationError(`Invalid content structure:\n- ${violations.join('\n- ')}`, {
        errors: violations.map((message) => ({
          name: 'ApplicationError',
          path: [] as string[],
          message,
        })),
      });
    }
  };

  const persistFromUpdate = async ({
    incomingStructure,
    createdUids,
    deletedUids,
  }: {
    incomingStructure?: unknown;
    createdUids: Map<string, ContentTypeKind>;
    deletedUids: Set<string>;
  }): Promise<boolean> => {
    const effectiveKinds = buildEffectiveUidKindSet(createdUids, deletedUids);

    if (incomingStructure !== undefined && incomingStructure !== null) {
      const pruned = pruneStructure(
        formatContentStructureObjectAsFile(incomingStructure),
        deletedUids,
        effectiveKinds
      );

      validateContentTypeUidReferences(pruned, effectiveKinds);

      await contentStructureService.write(pruned);
      return true;
    }

    if (deletedUids.size > 0) {
      const current = await contentStructureService.getCleanedFile();

      if (!current) {
        return false;
      }

      const pruned = pruneStructure(current, deletedUids, effectiveKinds);

      await contentStructureService.write(pruned);
      return true;
    }

    return false;
  };

  return {
    validateContentTypeUidReferences,
    persistFromUpdate,
  };
}
