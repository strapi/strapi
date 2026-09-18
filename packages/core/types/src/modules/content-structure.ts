import type * as UID from '../uid';

export type ContentStructureChild =
  | { type: 'contentType'; uid: UID.ContentType }
  | { type: 'group'; id: string };

export interface ContentStructureGroup {
  children: ContentStructureChild[];
  parent: string | null;
  name: string;
  id: string;
}

export interface ContentStructureSection {
  groups: ContentStructureGroup[];
}

export interface ContentStructureFile {
  version: 1;
  sections: {
    collectionTypes: ContentStructureSection;
    singleTypes: ContentStructureSection;
  };
}

export interface ResolvedGroupNode {
  children: ResolvedStructureChild[];
  type: 'group';
  name: string;
  id: string;
}

export type ResolvedStructureChild =
  | { type: 'contentType'; uid: UID.ContentType }
  | ResolvedGroupNode;

/**
 * The resolved trees of both content type sections. Exposed by strapi.get('content-structure').resolve().
 */
export interface ResolvedContentStructure {
  collectionTypes: ResolvedGroupNode[];
  singleTypes: ResolvedGroupNode[];
}

/**
 * ContentStructureFile['sections'] keys.
 */
export type ContentStructureSectionKey = 'collectionTypes' | 'singleTypes';
