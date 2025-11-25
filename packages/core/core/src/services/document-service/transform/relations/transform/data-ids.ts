import { curry } from 'lodash/fp';
import type { UID } from '@strapi/types';
import { errors, relations } from '@strapi/utils';
import type { ID, LongHandDocument } from '../utils/types';
import { IdMap } from '../../id-map';
import { getRelationTargetStatus } from '../utils/dp';
import { mapRelation, traverseEntityRelations } from '../utils/map-relation';

declare const strapi: any;

const { isPolymorphic } = relations;

// Critical fix: safely resolve locale
const getSafeTargetLocale = (
  _relation: LongHandDocument,
  opts: { targetUid: UID.Schema; sourceLocale?: string | null }
) => {
  const { sourceLocale, targetUid } = opts;

  if (sourceLocale !== null && sourceLocale !== undefined) {
    // Keep original behavior when locale is provided
    return sourceLocale;
  }

  const model = strapi.getModel(targetUid);
  const isLocalized = !!model?.pluginOptions?.i18n?.localized;
  return isLocalized ? 'en' : undefined; // ← non-i18n = no filter
};

interface Options {
  uid: UID.Schema;
  locale?: string | null;
  status?: 'draft' | 'published';
  allowMissingId?: boolean;
}

const getRelationIds = curry(
  (idMap: IdMap, source: Options, targetUid: UID.Schema, relation: LongHandDocument) => {
    const locale = getSafeTargetLocale(relation, {
      targetUid,
      sourceLocale: source.locale,
    });

    const statuses = getRelationTargetStatus(relation, {
      targetUid,
      sourceUid: source.uid,
      sourceStatus: source.status,
    });

    const ids: ID[] = [];
    for (const s of statuses) {
      const id = idMap.get({ uid: targetUid, documentId: relation.documentId, locale, status: s });
      if (id) ids.push(id);
    }

    if (!ids.length && !source.allowMissingId) {
      const msg = locale === undefined ? 'no locale (non-i18n)' : `"${locale}"`;
      throw new errors.ValidationError(`Document with id "${relation.documentId}", locale ${msg} not found`);
    }

    return ids;
  }
);

const transformDataIdsVisitor = (idMap: IdMap, data: any, source: Options) => {
  return traverseEntityRelations(
    async ({ key, value, attribute }, { set }) => {
      if (!attribute) return;

      const getIds = getRelationIds(idMap, source);
      const newVal = await mapRelation(async (rel: any) => {
        if (!rel?.documentId) return rel;

        const target = isPolymorphic(attribute) ? rel.__type : attribute.target;
        const ids = getIds(target, rel);

        const pos = { ...rel.position };
        if (pos?.before) {
          const beforeTarget = isPolymorphic(attribute) && pos.__type ? pos.__type : target;
          pos.before = getIds(beforeTarget, { ...rel, documentId: pos.before })[0];
        }
        if (pos?.after) {
          const afterTarget = isPolymorphic(attribute) && pos.__type ? pos.__type : target;
          pos.after = getIds(afterTarget, { ...rel, documentId: pos.after })[0];
        }

        return ids.map((id: any) => ({
          id,
          ...(rel.position && { position: pos }),
          ...(isPolymorphic(attribute) && { __type: target }),
        }));
      }, value);

      set(key, newVal);
    },
    { schema: strapi.getModel(source.uid), getModel: strapi.getModel.bind(strapi) },
    data
  );
};

export { transformDataIdsVisitor };