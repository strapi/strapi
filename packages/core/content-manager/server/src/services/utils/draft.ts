import { castArray } from 'lodash/fp';
import strapiUtils from '@strapi/utils';

import {
  type DraftRelationCounts,
  EMPTY_DRAFT_RELATION_COUNTS,
  isBidirectionalManyToMany,
  mergeDraftRelationCounts,
} from './draft-relations';

const { isVisibleAttribute, hasDraftAndPublish } = strapiUtils.contentTypes;

/**
 * sumDraftCounts works recursively on the attributes of a model counting draft relations
 * that matter for publish warnings.
 *
 * - unpublishedRelations: xToOne / oneToMany style links stripped from the published version
 * - draftM2mLinks: bidirectional manyToMany links kept on publish (informational)
 */
const sumDraftCounts = (entity: any, uid: any): DraftRelationCounts => {
  const model = strapi.getModel(uid);

  return Object.keys(model.attributes).reduce((counts, attributeName) => {
    const attribute: any = model.attributes[attributeName];
    const value = entity[attributeName];

    if (!value) {
      return counts;
    }

    switch (attribute.type) {
      case 'relation': {
        if (!('target' in attribute)) {
          return counts;
        }

        const targetModel = strapi.getModel(attribute.target);
        if (!targetModel || !hasDraftAndPublish(targetModel)) {
          return counts;
        }

        // Self-referential relations are preserved on publish (see self-referential-relations.ts).
        if (attribute.target === uid) {
          return counts;
        }

        if (!isVisibleAttribute(model, attributeName)) {
          return counts;
        }

        if (isBidirectionalManyToMany(attribute)) {
          return {
            ...counts,
            draftM2mLinks: counts.draftM2mLinks + value.count,
          };
        }

        return {
          ...counts,
          unpublishedRelations: counts.unpublishedRelations + value.count,
        };
      }
      case 'component': {
        const compoCounts = castArray(value).reduce(
          (acc, componentValue) =>
            mergeDraftRelationCounts(acc, sumDraftCounts(componentValue, attribute.component)),
          EMPTY_DRAFT_RELATION_COUNTS
        );

        return mergeDraftRelationCounts(counts, compoCounts);
      }
      case 'dynamiczone': {
        const dzCounts = value.reduce((acc: DraftRelationCounts, componentValue: any) => {
          return mergeDraftRelationCounts(
            acc,
            sumDraftCounts(componentValue, componentValue.__component)
          );
        }, EMPTY_DRAFT_RELATION_COUNTS);

        return mergeDraftRelationCounts(counts, dzCounts);
      }
      default:
        return counts;
    }
  }, EMPTY_DRAFT_RELATION_COUNTS);
};

export { sumDraftCounts };
