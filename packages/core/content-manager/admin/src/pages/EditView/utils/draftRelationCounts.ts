import type { Component } from '../../../../../shared/contracts/components';
import type { ComponentsDictionary, Schema } from '../../../hooks/useDocument';
import type { RelationsFormValue } from '../components/FormInputs/Relations/Relations';

export interface DraftRelationCounts {
  unpublishedRelations: number;
  draftM2mLinks: number;
}

export const EMPTY_DRAFT_RELATION_COUNTS: DraftRelationCounts = {
  unpublishedRelations: 0,
  draftM2mLinks: 0,
};

export const isBidirectionalManyToMany = (attribute: Schema['attributes'][string]) => {
  if (attribute.type !== 'relation' || attribute.relation !== 'manyToMany') {
    return false;
  }

  const relationAttribute = attribute as Extract<
    Schema['attributes'][string],
    { type: 'relation'; relation: 'manyToMany' }
  > & {
    inversedBy?: string;
    mappedBy?: string;
  };

  return Boolean(relationAttribute.inversedBy || relationAttribute.mappedBy);
};

export const mergeDraftRelationCounts = (
  left: DraftRelationCounts,
  right: DraftRelationCounts
): DraftRelationCounts => ({
  unpublishedRelations: left.unpublishedRelations + right.unpublishedRelations,
  draftM2mLinks: left.draftM2mLinks + right.draftM2mLinks,
});

export const normalizeDraftRelationCounts = (payload: unknown): DraftRelationCounts => {
  if (
    payload &&
    typeof payload === 'object' &&
    'unpublishedRelations' in payload &&
    'draftM2mLinks' in payload
  ) {
    return payload as DraftRelationCounts;
  }

  if (payload && typeof payload === 'object' && 'data' in payload) {
    return normalizeDraftRelationCounts((payload as { data: unknown }).data);
  }

  return EMPTY_DRAFT_RELATION_COUNTS;
};

export const resolveDraftRelationCounts = (
  documentId: string | undefined,
  modified: boolean,
  localCounts: DraftRelationCounts,
  serverCounts: DraftRelationCounts
): DraftRelationCounts => {
  if (!documentId) {
    return localCounts;
  }

  if (modified) {
    return mergeDraftRelationCounts(localCounts, serverCounts);
  }

  return serverCounts;
};

export interface DraftRelationsPublishState {
  hasUnpublishedRelations: boolean;
  hasDraftM2mLinks: boolean;
  hasDraftRelations: boolean;
  isM2mOnlyDraftRelations: boolean;
  dialogVariant: 'default' | 'danger';
  bodyIcon: 'default' | 'danger';
  confirmLabel: 'publish' | 'publish-without-relations';
}

export const getDraftRelationsPublishState = (
  counts: DraftRelationCounts
): DraftRelationsPublishState => {
  const hasUnpublishedRelations = counts.unpublishedRelations > 0;
  const hasDraftM2mLinks = counts.draftM2mLinks > 0;
  const hasDraftRelations = hasUnpublishedRelations || hasDraftM2mLinks;
  const isM2mOnlyDraftRelations = hasDraftM2mLinks && !hasUnpublishedRelations;

  return {
    hasUnpublishedRelations,
    hasDraftM2mLinks,
    hasDraftRelations,
    isM2mOnlyDraftRelations,
    dialogVariant: isM2mOnlyDraftRelations ? 'default' : 'danger',
    bodyIcon: isM2mOnlyDraftRelations ? 'default' : 'danger',
    confirmLabel: isM2mOnlyDraftRelations ? 'publish' : 'publish-without-relations',
  };
};

/**
 * Counts draft relations in unsaved form values, excluding self-referential relations
 * (preserved on publish via document-service self-referential-relations).
 */
export const countLocalDraftRelations = (
  data: Record<string, unknown>,
  schema: Schema | Component | undefined,
  components: ComponentsDictionary,
  contentTypeUid: string
): DraftRelationCounts => {
  if (!schema?.attributes) {
    return EMPTY_DRAFT_RELATION_COUNTS;
  }

  return Object.keys(schema.attributes).reduce((counts, attributeName) => {
    const attribute = schema.attributes[attributeName];
    const value = data[attributeName];

    if (!value) {
      return counts;
    }

    switch (attribute.type) {
      case 'relation': {
        if (!('target' in attribute) || attribute.target === contentTypeUid) {
          return counts;
        }

        if (typeof value === 'object' && value !== null && 'connect' in value) {
          const draftConnectCount =
            (value as RelationsFormValue).connect?.filter((relation) => relation.status === 'draft')
              .length ?? 0;

          if (draftConnectCount === 0) {
            return counts;
          }

          if (isBidirectionalManyToMany(attribute)) {
            return {
              ...counts,
              draftM2mLinks: counts.draftM2mLinks + draftConnectCount,
            };
          }

          return {
            ...counts,
            unpublishedRelations: counts.unpublishedRelations + draftConnectCount,
          };
        }

        return counts;
      }
      case 'component': {
        const componentItems = Array.isArray(value) ? value : [value];
        const componentSchema = components[attribute.component];

        return componentItems.reduce(
          (componentCounts, componentValue) =>
            mergeDraftRelationCounts(
              componentCounts,
              countLocalDraftRelations(
                componentValue as Record<string, unknown>,
                componentSchema,
                components,
                contentTypeUid
              )
            ),
          counts
        );
      }
      case 'dynamiczone': {
        return (value as Array<Record<string, unknown>>).reduce((zoneCounts, componentValue) => {
          const componentUid = componentValue.__component as string;

          return mergeDraftRelationCounts(
            zoneCounts,
            countLocalDraftRelations(
              componentValue,
              components[componentUid],
              components,
              contentTypeUid
            )
          );
        }, counts);
      }
      default:
        return counts;
    }
  }, EMPTY_DRAFT_RELATION_COUNTS);
};
