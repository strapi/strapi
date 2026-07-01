import { castArray } from 'lodash/fp';
import strapiUtils from '@strapi/utils';
import type { UID } from '@strapi/types';

import { type DraftRelationCounts, isBidirectionalManyToMany } from './draft-relations';

const { isVisibleAttribute, hasDraftAndPublish } = strapiUtils.contentTypes;

const isLocalizedContentType = (model: { pluginOptions?: unknown }) =>
  (model.pluginOptions as { i18n?: { localized?: boolean } } | undefined)?.i18n?.localized === true;

type DraftRelationLinkRef = {
  targetUid: UID.Schema;
  documentId: string;
  locale?: string | null;
};

type CollectedDraftRelationLinks = {
  m2mLinks: DraftRelationLinkRef[];
  xToOneLinks: DraftRelationLinkRef[];
};

const toPublishedDocumentKey = (documentId: string, locale?: string | null) =>
  `${documentId}:${locale ?? ''}`;

const mergeCollectedLinks = (
  left: CollectedDraftRelationLinks,
  right: CollectedDraftRelationLinks
): CollectedDraftRelationLinks => ({
  m2mLinks: [...left.m2mLinks, ...right.m2mLinks],
  xToOneLinks: [...left.xToOneLinks, ...right.xToOneLinks],
});

const toDraftRelationLink = (
  entry: { documentId?: string; locale?: string | null },
  targetUid: UID.Schema,
  targetIsLocalized: boolean,
  documentLocale?: string | null
): DraftRelationLinkRef | null => {
  if (!entry?.documentId) {
    return null;
  }

  return {
    targetUid,
    documentId: entry.documentId,
    locale: targetIsLocalized ? (entry.locale ?? documentLocale) : null,
  };
};

const collectDraftRelationLinks = (
  entity: any,
  uid: UID.Schema,
  documentLocale?: string | null
): CollectedDraftRelationLinks => {
  const model = strapi.getModel(uid);
  const locale = entity.locale ?? documentLocale;

  return Object.keys(model.attributes).reduce(
    (collected, attributeName) => {
      const attribute: any = model.attributes[attributeName];
      const value = entity[attributeName];

      if (!value) {
        return collected;
      }

      switch (attribute.type) {
        case 'relation': {
          if (!('target' in attribute)) {
            return collected;
          }

          const targetModel = strapi.getModel(attribute.target);
          if (!targetModel || !hasDraftAndPublish(targetModel)) {
            return collected;
          }

          if (attribute.target === uid || !isVisibleAttribute(model, attributeName)) {
            return collected;
          }

          const targetIsLocalized = isLocalizedContentType(targetModel);
          const relatedEntries = castArray(value);
          const links = relatedEntries
            .map((entry) => toDraftRelationLink(entry, attribute.target, targetIsLocalized, locale))
            .filter((link): link is DraftRelationLinkRef => link !== null);

          if (links.length === 0) {
            return collected;
          }

          if (isBidirectionalManyToMany(attribute)) {
            return {
              ...collected,
              m2mLinks: [...collected.m2mLinks, ...links],
            };
          }

          return {
            ...collected,
            xToOneLinks: [...collected.xToOneLinks, ...links],
          };
        }
        case 'component': {
          return castArray(value).reduce(
            (componentCollected, componentValue) =>
              mergeCollectedLinks(
                componentCollected,
                collectDraftRelationLinks(componentValue, attribute.component, locale)
              ),
            collected
          );
        }
        case 'dynamiczone': {
          return value.reduce((zoneCollected: CollectedDraftRelationLinks, componentValue: any) => {
            return mergeCollectedLinks(
              zoneCollected,
              collectDraftRelationLinks(componentValue, componentValue.__component, locale)
            );
          }, collected);
        }
        default:
          return collected;
      }
    },
    { m2mLinks: [], xToOneLinks: [] } as CollectedDraftRelationLinks
  );
};

const countLinksToUnpublishedDocuments = async (links: DraftRelationLinkRef[]) => {
  if (links.length === 0) {
    return 0;
  }

  const linksByTarget = links.reduce<Map<UID.Schema, DraftRelationLinkRef[]>>((acc, link) => {
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
const sumDraftCounts = async (entity: any, uid: UID.Schema): Promise<DraftRelationCounts> => {
  const { m2mLinks, xToOneLinks } = collectDraftRelationLinks(entity, uid);

  const [draftM2mLinks, unpublishedRelations] = await Promise.all([
    countLinksToUnpublishedDocuments(m2mLinks),
    countLinksToUnpublishedDocuments(xToOneLinks),
  ]);

  return {
    unpublishedRelations,
    draftM2mLinks,
  };
};

export { sumDraftCounts };
