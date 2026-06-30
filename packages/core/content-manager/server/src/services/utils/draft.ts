import { castArray } from 'lodash/fp';
import strapiUtils from '@strapi/utils';
import type { UID } from '@strapi/types';

import {
  type DraftRelationCounts,
  EMPTY_DRAFT_RELATION_COUNTS,
  isBidirectionalManyToMany,
  mergeDraftRelationCounts,
} from './draft-relations';

const { isVisibleAttribute, hasDraftAndPublish } = strapiUtils.contentTypes;

const isLocalizedContentType = (model: { pluginOptions?: unknown }) =>
  (model.pluginOptions as { i18n?: { localized?: boolean } } | undefined)?.i18n?.localized === true;

type M2mLinkRef = {
  targetUid: UID.Schema;
  documentId: string;
  locale?: string | null;
};

const toPublishedDocumentKey = (documentId: string, locale?: string | null) =>
  `${documentId}:${locale ?? ''}`;

/**
 * Draft-count populate uses `{ count: true, filters: { publishedAt: { $null: true } } }`.
 * joinColumn xToOne / oneToMany paths still return populated entities or arrays (not `{ count }`),
 * but only rows matching the draft filter are included.
 */
const getUnpublishedRelationCount = (value: unknown): number => {
  if (!value) {
    return 0;
  }

  if (typeof value === 'object' && value !== null && 'count' in value) {
    const count = (value as { count: unknown }).count;
    return typeof count === 'number' ? count : 0;
  }

  if (Array.isArray(value)) {
    return value.length;
  }

  return 1;
};

const collectBidirectionalM2mLinks = (
  entity: any,
  uid: UID.Schema,
  documentLocale?: string | null
): M2mLinkRef[] => {
  const model = strapi.getModel(uid);
  const locale = entity.locale ?? documentLocale;

  return Object.keys(model.attributes).reduce((links, attributeName) => {
    const attribute: any = model.attributes[attributeName];
    const value = entity[attributeName];

    if (!value) {
      return links;
    }

    switch (attribute.type) {
      case 'relation': {
        if (!('target' in attribute)) {
          return links;
        }

        const targetModel = strapi.getModel(attribute.target);
        if (!targetModel || !hasDraftAndPublish(targetModel)) {
          return links;
        }

        if (attribute.target === uid || !isVisibleAttribute(model, attributeName)) {
          return links;
        }

        if (isBidirectionalManyToMany(attribute)) {
          const relatedEntries = castArray(value);
          const targetIsLocalized = isLocalizedContentType(targetModel);

          return [
            ...links,
            ...relatedEntries.map((entry) => ({
              targetUid: attribute.target,
              documentId: entry.documentId,
              locale: targetIsLocalized ? (entry.locale ?? locale) : null,
            })),
          ];
        }

        return links;
      }
      case 'component': {
        return castArray(value).reduce(
          (componentLinks, componentValue) => [
            ...componentLinks,
            ...collectBidirectionalM2mLinks(componentValue, attribute.component, locale),
          ],
          links
        );
      }
      case 'dynamiczone': {
        return value.reduce((zoneLinks: M2mLinkRef[], componentValue: any) => {
          return [
            ...zoneLinks,
            ...collectBidirectionalM2mLinks(componentValue, componentValue.__component, locale),
          ];
        }, links);
      }
      default:
        return links;
    }
  }, [] as M2mLinkRef[]);
};

const countLinksToUnpublishedDocuments = async (links: M2mLinkRef[]) => {
  if (links.length === 0) {
    return 0;
  }

  const linksByTarget = links.reduce<Map<UID.Schema, M2mLinkRef[]>>((acc, link) => {
    const targetLinks = acc.get(link.targetUid) ?? [];
    targetLinks.push(link);
    acc.set(link.targetUid, targetLinks);
    return acc;
  }, new Map());

  const counts = await Promise.all(
    Array.from(linksByTarget.entries()).map(async ([targetUid, targetLinks]) => {
      const targetModel = strapi.getModel(targetUid);
      const targetIsLocalized = isLocalizedContentType(targetModel);
      const documentIds = [...new Set(targetLinks.map((link) => link.documentId))];

      const publishedRows = await strapi.db.query(targetUid).findMany({
        select: ['documentId', 'locale'],
        where: {
          documentId: { $in: documentIds },
          publishedAt: { $notNull: true },
        },
      });

      if (!targetIsLocalized) {
        const publishedDocumentIds = new Set(publishedRows.map((row) => row.documentId));

        return targetLinks.filter((link) => !publishedDocumentIds.has(link.documentId)).length;
      }

      const publishedDocumentKeys = new Set(
        publishedRows.map((row) => toPublishedDocumentKey(row.documentId, row.locale))
      );

      return targetLinks.filter(
        (link) => !publishedDocumentKeys.has(toPublishedDocumentKey(link.documentId, link.locale))
      ).length;
    })
  );

  return counts.reduce((total, count) => total + count, 0);
};

/**
 * sumDraftCounts works recursively on the attributes of a model counting draft relations
 * that matter for publish warnings.
 *
 * - unpublishedRelations: xToOne / oneToMany style links stripped from the published version
 * - draftM2mLinks: bidirectional manyToMany links to documents without a published version
 */
const sumDraftCountsSync = (entity: any, uid: UID.Schema): DraftRelationCounts => {
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
          return counts;
        }

        return {
          ...counts,
          unpublishedRelations: counts.unpublishedRelations + getUnpublishedRelationCount(value),
        };
      }
      case 'component': {
        const compoCounts = castArray(value).reduce(
          (acc, componentValue) =>
            mergeDraftRelationCounts(acc, sumDraftCountsSync(componentValue, attribute.component)),
          EMPTY_DRAFT_RELATION_COUNTS
        );

        return mergeDraftRelationCounts(counts, compoCounts);
      }
      case 'dynamiczone': {
        const dzCounts = value.reduce((acc: DraftRelationCounts, componentValue: any) => {
          return mergeDraftRelationCounts(
            acc,
            sumDraftCountsSync(componentValue, componentValue.__component)
          );
        }, EMPTY_DRAFT_RELATION_COUNTS);

        return mergeDraftRelationCounts(counts, dzCounts);
      }
      default:
        return counts;
    }
  }, EMPTY_DRAFT_RELATION_COUNTS);
};

const sumDraftCounts = async (entity: any, uid: UID.Schema): Promise<DraftRelationCounts> => {
  const counts = sumDraftCountsSync(entity, uid);
  const draftM2mLinks = await countLinksToUnpublishedDocuments(
    collectBidirectionalM2mLinks(entity, uid)
  );

  return {
    ...counts,
    draftM2mLinks,
  };
};

export { sumDraftCounts };
