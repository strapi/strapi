import isEqual from 'lodash/isEqual';
import omit from 'lodash/omit';

import type { Status } from '../../../types';
import type { Modules, Struct } from '@strapi/types';

export type SectionKey = Modules.ContentStructure.ContentStructureSectionKey;

export type ContentStructureChild = Modules.ContentStructure.ContentStructureChild;

/**
 * The status of a content structure group, excluding "REMOVED".
 * The contentStructure API is declarative, so the server will identify removed groups by their absence in the submitted structure.
 * The admin panel will remove groups from the tree upon deletion, so the "REMOVED" status is impossible to reach.
 */
export type GroupStatus = Exclude<Status, 'REMOVED'>;

export type ContentStructureGroup = Modules.ContentStructure.ContentStructureGroup & {
  status: GroupStatus;
};

export type ContentStructureSection = {
  groups: ContentStructureGroup[];
};

export const CONTENT_STRUCTURE_VERSION = 1;
export const MAX_FOLDER_DEPTH = 3;

/**
 * Admin-side model of the content-structure (folder groups).
 *
 * The admin is identical to the server-side structure, but for the inclusion of a `status` field on every group.
 * This allows the admin panel to track changes to the content structure using existing patterns.
 *
 * The `status` field is stripped by {@link toServerFile} before a client-modified structure is sent to the server.
 */
export type ContentStructure = {
  version: typeof CONTENT_STRUCTURE_VERSION;
  sections: Record<SectionKey, ContentStructureSection>;
};

export const SECTION_KEYS = [
  'collectionTypes',
  'singleTypes',
] as const satisfies readonly SectionKey[];

export function sectionKeyForKind(kind: Struct.ContentTypeKind): SectionKey {
  return kind === 'singleType' ? 'singleTypes' : 'collectionTypes';
}

export function createEmptyContentStructure(): ContentStructure {
  return {
    version: CONTENT_STRUCTURE_VERSION,
    sections: {
      collectionTypes: { groups: [] },
      singleTypes: { groups: [] },
    },
  };
}

const addStatusToSection = (
  section: Modules.ContentStructure.ContentStructureSection | undefined
): ContentStructureSection => {
  return {
    groups: (section?.groups || []).map((group) => ({
      ...group,
      status: 'UNCHANGED',
    })),
  };
};

export function fromServerFile(
  file: Modules.ContentStructure.ContentStructureFile | null | undefined
): ContentStructure {
  if (!file || !file.sections) {
    return createEmptyContentStructure();
  }

  return {
    version: CONTENT_STRUCTURE_VERSION,
    sections: {
      collectionTypes: addStatusToSection(file.sections.collectionTypes),
      singleTypes: addStatusToSection(file.sections.singleTypes),
    },
  };
}

const removeStatusFromSection = (
  section: ContentStructureSection
): Modules.ContentStructure.ContentStructureSection => {
  return {
    groups: section.groups.map((group) => omit(group, 'status')),
  };
};

export function toServerFile(
  structure: ContentStructure
): Modules.ContentStructure.ContentStructureFile {
  return {
    version: CONTENT_STRUCTURE_VERSION,
    sections: {
      collectionTypes: removeStatusFromSection(structure.sections.collectionTypes),
      singleTypes: removeStatusFromSection(structure.sections.singleTypes),
    },
  };
}

/**
 * Determines whether two contentStructure trees differ in any way the server would persist.
 *
 * The client-side state manager removes groups from the tree upon deletion.
 * This means that the "REMOVED" status is impossible to reach. See {@link GroupStatus}.
 */
export function hasContentStructureChanged(
  working: ContentStructure,
  initial: ContentStructure
): boolean {
  return !isEqual(toServerFile(working), toServerFile(initial));
}

export function generateGroupId(): string {
  const body = crypto.randomUUID().replace(/-/g, '').slice(0, 24);
  return `grp_${body}`;
}
