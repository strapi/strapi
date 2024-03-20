import { Common } from '@strapi/types';
import { traverseEntity, errors } from '@strapi/utils';

import { ID } from '../utils/types';
import { IdMap } from '../../id-map';
import { getRelationTargetLocale } from '../utils/i18n';
import { getRelationTargetStatus } from '../utils/dp';
import { mapRelation } from '../utils/map-relation';

const transformDataIdsVisitor = (
  idMap: IdMap,
  data: Record<string, any>,
  opts: {
    uid: UID.Schema;
    locale?: string | null;
    status?: 'draft' | 'published';
    allowMissingId?: boolean; // Whether to ignore missing ids and not throw any error
  }
) => {
  return traverseEntity(
    async ({ key, value, attribute }, { set }) => {
      // Find relational attributes, and return the document ids
      if (attribute.type === 'relation') {
        const target = attribute.target as UID.Schema | undefined;
        // TODO: Handle polymorphic relations
        if (!target) return;

        const getIds = (
          documentId: ID,
          locale?: string,
          status?: 'draft' | 'published'
        ): ID[] | null => {
          // locale to connect to
          const targetLocale = getRelationTargetLocale(
            { documentId, locale },
            { targetUid: target, sourceUid: opts.uid, sourceLocale: opts.locale }
          );

          // status(es) to connect to
          const targetStatuses = getRelationTargetStatus(
            { documentId, status },
            { targetUid: target, sourceUid: opts.uid, sourceStatus: opts.status }
          );

          const ids = [];

          // Find mapping between documentID -> id(s).
          // There are scenarios where a single documentID can map to multiple ids.
          // e.g when connecting Non DP -> DP and connecting to both the draft and publish version at the same time
          for (const targetStatus of targetStatuses) {
            const entryId = idMap.get({
              uid: target,
              documentId,
              locale: targetLocale,
              status: targetStatus,
            });

            if (entryId) ids.push(entryId);
          }

          if (!ids.length && !opts.allowMissingId) {
            throw new errors.ValidationError(
              `Document with id "${documentId}", locale "${targetLocale}" not found`
            );
          }

          return ids;
        };

        const transformRelation = mapRelation((relation) => {
          if (!relation || !relation.documentId) {
            return relation;
          }

          const ids = getIds(relation.documentId, relation.locale, relation.status);
          return ids?.map((id) => ({ id }));
        });

        set(key, (await transformRelation(value as any)) as any);
      }
    },
    { schema: strapi.getModel(opts.uid) },
    data
  );
};

export { transformDataIdsVisitor };
