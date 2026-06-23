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
 * Bidirectional manyToMany links are document-scoped: they may not appear on the live site
 * until the related entry publishes, but they are not stripped the same way as xToOne links.
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
