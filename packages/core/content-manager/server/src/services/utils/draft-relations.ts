import type { Schema } from '@strapi/types';

type RelationAttribute = Schema.Attribute.Relation & {
  target?: string;
  inversedBy?: string;
  mappedBy?: string;
};

export interface DraftRelationCounts {
  unpublishedRelations: number;
  draftM2mLinks: number;
}

export const EMPTY_DRAFT_RELATION_COUNTS: DraftRelationCounts = {
  unpublishedRelations: 0,
  draftM2mLinks: 0,
};

/**
 * Bidirectional manyToMany links share a join-table row and are kept on publish; they become
 * visible on the live site once the related entry is published. xToOne-style links are stripped.
 */
export const isBidirectionalManyToMany = (attribute: RelationAttribute) =>
  attribute.relation === 'manyToMany' && Boolean(attribute.inversedBy || attribute.mappedBy);

export const mergeDraftRelationCounts = (
  left: DraftRelationCounts,
  right: DraftRelationCounts
): DraftRelationCounts => ({
  unpublishedRelations: left.unpublishedRelations + right.unpublishedRelations,
  draftM2mLinks: left.draftM2mLinks + right.draftM2mLinks,
});
