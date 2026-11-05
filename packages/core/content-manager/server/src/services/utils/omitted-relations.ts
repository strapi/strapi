import { castArray } from 'lodash';

import * as strapiUtils from '@strapi/utils';
import type { Core, UID } from '@strapi/types';

const { isVisibleAttribute, hasDraftAndPublish } = strapiUtils.contentTypes;

type VersionRef = {
  documentId?: string;
  locale?: string | null;
};

type RelationLink = {
  targetUid: UID.Schema;
  documentId: string;
  locale?: string | null;
};

const publicationStatusKey = (version: VersionRef) =>
  `${version.documentId ?? ''}\t${version.locale ?? ''}`;

const linkKey = (link: RelationLink) =>
  `${link.targetUid}\t${link.documentId}\t${link.locale ?? ''}`;

const relationPopulateCache = new Map<
  string,
  { populate: Record<string, unknown>; hasRelations: boolean }
>();

/**
 * Populate documentId (and locale, when the target is localized) for every draft-and-publish
 * relation, including relations inside components and dynamic zones.
 * Unlike the draft-count populate, this does not filter on publishedAt: a draft row stays
 * unpublished even after its document has a published version.
 */
const getRelationDocumentPopulate = (
  strapi: Core.Strapi,
  uid: UID.Schema
): { populate: Record<string, unknown>; hasRelations: boolean } => {
  const cached = relationPopulateCache.get(uid);
  if (cached) {
    return cached;
  }

  const model = strapi.getModel(uid);
  if (!model) {
    return { populate: {}, hasRelations: false };
  }

  let hasRelations = false;
  const populate = Object.keys(model.attributes).reduce(
    (populateAcc: Record<string, unknown>, attributeName) => {
      const attribute: any = model.attributes[attributeName];

      switch (attribute.type) {
        case 'relation': {
          const isMorphRelation = String(attribute.relation ?? '')
            .toLowerCase()
            .startsWith('morph');
          if (isMorphRelation || !('target' in attribute)) {
            return populateAcc;
          }

          const targetModel = strapi.getModel(attribute.target as UID.Schema);
          if (!targetModel || !hasDraftAndPublish(targetModel)) {
            return populateAcc;
          }

          // Self-referential relations are kept on publish.
          if (attribute.target === uid || !isVisibleAttribute(model, attributeName)) {
            return populateAcc;
          }

          const fields = ['documentId'];
          if (strapi.localization.isLocalizedContentType(targetModel) === true) {
            fields.push('locale');
          }

          populateAcc[attributeName] = { fields };
          hasRelations = true;
          return populateAcc;
        }
        case 'component': {
          const nested = getRelationDocumentPopulate(strapi, attribute.component);
          if (nested.hasRelations) {
            populateAcc[attributeName] = { populate: nested.populate };
            hasRelations = true;
          }
          return populateAcc;
        }
        case 'dynamiczone': {
          const on = (attribute.components ?? []).reduce(
            (acc: Record<string, unknown>, componentUid: UID.Component) => {
              const nested = getRelationDocumentPopulate(strapi, componentUid);
              if (nested.hasRelations) {
                acc[componentUid] = { populate: nested.populate };
                hasRelations = true;
              }
              return acc;
            },
            {}
          );

          if (Object.keys(on).length > 0) {
            populateAcc[attributeName] = { on };
          }
          return populateAcc;
        }
        default:
          return populateAcc;
      }
    },
    {}
  );

  const result = { populate, hasRelations };
  relationPopulateCache.set(uid, result);
  return result;
};

const collectRelationLinks = (
  strapi: Core.Strapi,
  entity: any,
  uid: UID.Schema,
  documentLocale?: string | null
): RelationLink[] => {
  const model = strapi.getModel(uid);
  if (!model || !entity) {
    return [];
  }

  return Object.keys(model.attributes).reduce((links, attributeName) => {
    const attribute: any = model.attributes[attributeName];
    const value = entity[attributeName];
    if (value == null) {
      return links;
    }

    switch (attribute.type) {
      case 'relation': {
        if (!('target' in attribute)) {
          return links;
        }

        const targetModel = strapi.getModel(attribute.target as UID.Schema);
        if (!targetModel || !hasDraftAndPublish(targetModel)) {
          return links;
        }

        if (attribute.target === uid || !isVisibleAttribute(model, attributeName)) {
          return links;
        }

        const targetIsLocalized = strapi.localization.isLocalizedContentType(targetModel) === true;
        const related: RelationLink[] = [];
        for (const entry of castArray(value)) {
          if (!entry?.documentId) {
            continue;
          }

          related.push({
            targetUid: attribute.target as UID.Schema,
            documentId: String(entry.documentId),
            locale: targetIsLocalized ? (entry.locale ?? documentLocale ?? null) : null,
          });
        }

        return links.concat(related);
      }
      case 'component': {
        return castArray(value).reduce(
          (componentLinks: RelationLink[], componentValue) =>
            componentLinks.concat(
              collectRelationLinks(strapi, componentValue, attribute.component, documentLocale)
            ),
          links
        );
      }
      case 'dynamiczone': {
        return value.reduce((zoneLinks: RelationLink[], componentValue: any) => {
          if (!componentValue?.__component) {
            return zoneLinks;
          }

          return zoneLinks.concat(
            collectRelationLinks(strapi, componentValue, componentValue.__component, documentLocale)
          );
        }, links);
      }
      default:
        return links;
    }
  }, [] as RelationLink[]);
};

const countLinks = (links: RelationLink[]) => {
  const counts = new Map<string, { link: RelationLink; count: number }>();

  for (const link of links) {
    const key = linkKey(link);
    const current = counts.get(key);
    if (current) {
      current.count += 1;
    } else {
      counts.set(key, { link, count: 1 });
    }
  }

  return counts;
};

const publishedTargetKeys = async (strapi: Core.Strapi, links: RelationLink[]) => {
  const linksByTarget = links.reduce<Map<UID.Schema, RelationLink[]>>((acc, link) => {
    const targetLinks = acc.get(link.targetUid) ?? [];
    targetLinks.push(link);
    acc.set(link.targetUid, targetLinks);
    return acc;
  }, new Map());

  const keys = new Set<string>();

  await Promise.all(
    Array.from(linksByTarget.entries()).map(async ([targetUid, targetLinks]) => {
      const targetModel = strapi.getModel(targetUid);
      const targetIsLocalized = strapi.localization.isLocalizedContentType(targetModel) === true;
      const documentIds = [...new Set(targetLinks.map((link) => link.documentId))];
      const publishedRows = (await strapi.db.query(targetUid).findMany({
        select: targetIsLocalized ? ['documentId', 'locale'] : ['documentId'],
        where: {
          documentId: { $in: documentIds },
          publishedAt: { $notNull: true },
        },
      })) as { documentId: string; locale?: string | null }[];

      if (!targetIsLocalized) {
        const publishedDocumentIds = new Set(publishedRows.map((row) => row.documentId));
        for (const link of targetLinks) {
          if (publishedDocumentIds.has(link.documentId)) {
            keys.add(linkKey(link));
          }
        }
        return;
      }

      const publishedKeys = new Set(
        publishedRows.map((row) => `${row.documentId}\t${row.locale ?? ''}`)
      );
      for (const link of targetLinks) {
        if (publishedKeys.has(`${link.documentId}\t${link.locale ?? ''}`)) {
          keys.add(linkKey(link));
        }
      }
    })
  );

  return keys;
};

/**
 * Document keys (`documentId`, locale) whose draft has a relation the published version lacks,
 * and whose target now has a published version. Republishing the document would copy that link.
 * Relations that publish restores on its own are absent from the result, because they are already
 * on the published version.
 */
const findDocumentKeysWithOmittedRelations = async (
  strapi: Core.Strapi,
  uid: UID.ContentType,
  versions: VersionRef[]
) => {
  const candidates = versions.filter((version) => version.documentId);
  if (candidates.length === 0) {
    return new Set<string>();
  }

  const { populate, hasRelations } = getRelationDocumentPopulate(strapi, uid);
  if (!hasRelations) {
    return new Set<string>();
  }

  const model = strapi.getModel(uid);
  const localized = strapi.localization.isLocalizedContentType(model) === true;
  const groups = new Map<string, VersionRef[]>();

  for (const version of candidates) {
    const localeKey = localized ? (version.locale ?? '') : '';
    const group = groups.get(localeKey) ?? [];
    group.push(version);
    groups.set(localeKey, group);
  }

  const omitted = new Set<string>();

  for (const [localeKey, group] of groups) {
    const documentIds = [...new Set(group.map((version) => version.documentId as string))];
    const locale = localized && localeKey !== '' ? localeKey : undefined;
    const params = {
      filters: { documentId: { $in: documentIds } },
      populate,
      limit: documentIds.length,
      ...(locale ? { locale } : {}),
    };

    const [drafts, published] = await Promise.all([
      strapi.documents(uid).findMany({ ...params, status: 'draft' } as any),
      strapi.documents(uid).findMany({ ...params, status: 'published' } as any),
    ]);

    const publishedByKey = new Map(published.map((entry) => [publicationStatusKey(entry), entry]));

    const missingLinks: RelationLink[] = [];
    const missingByDocument = new Map<string, RelationLink[]>();

    for (const draft of drafts) {
      const key = publicationStatusKey(draft);
      const publishedEntry = publishedByKey.get(key);
      if (!publishedEntry) {
        continue;
      }

      const draftCounts = countLinks(
        collectRelationLinks(strapi, draft, uid, draft.locale ?? locale)
      );
      const publishedCounts = countLinks(
        collectRelationLinks(strapi, publishedEntry, uid, publishedEntry.locale ?? locale)
      );
      const documentMissing: RelationLink[] = [];

      for (const [relationKey, { link, count }] of draftCounts) {
        const publishedCount = publishedCounts.get(relationKey)?.count ?? 0;
        if (count > publishedCount) {
          documentMissing.push(link);
        }
      }

      if (documentMissing.length > 0) {
        missingByDocument.set(key, documentMissing);
        missingLinks.push(...documentMissing);
      }
    }

    const restorable = await publishedTargetKeys(strapi, missingLinks);
    for (const [key, links] of missingByDocument) {
      if (links.some((link) => restorable.has(linkKey(link)))) {
        omitted.add(key);
      }
    }
  }

  return omitted;
};

const statusWithOmittedRelations = (
  status: string | undefined,
  version: VersionRef,
  omittedKeys: Set<string>
) => {
  if (
    status === 'published' &&
    version.documentId &&
    omittedKeys.has(publicationStatusKey(version))
  ) {
    return 'modified';
  }

  return status;
};

export { findDocumentKeysWithOmittedRelations, publicationStatusKey, statusWithOmittedRelations };
