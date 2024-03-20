import { Common } from '@strapi/types';
import { traverseEntity } from '@strapi/utils';
import { IdMap } from '../../id-map';
import { getRelationTargetLocale } from '../utils/i18n';
import { getRelationTargetStatus } from '../utils/dp';
import { mapRelation } from '../utils/map-relation';

/**
 * Iterate over all attributes of a Data object and extract all relational document ids.
 * Those will later be transformed to entity ids.
 */
const extractDataIds = (
  idMap: IdMap,
  data: Record<string, any>,
  opts: { uid: UID.Schema; locale?: string | null; status?: 'draft' | 'published' }
) => {
  return traverseEntity(
    async ({ value, attribute }) => {
      // Find relational attributes, and return the document ids
      if (attribute.type === 'relation') {
        // TODO: Handle morph relations (they have multiple targets)
        const target = attribute.target;
        if (!target) return;

        await mapRelation((relation) => {
          if (!relation || !relation.documentId) {
            return relation;
          }

          const targetLocale = getRelationTargetLocale(relation, {
            targetUid: target as UID.Schema,
            sourceUid: opts.uid,
            sourceLocale: opts.locale,
          });

          const targetStatus = getRelationTargetStatus(relation, {
            targetUid: target as UID.Schema,
            sourceUid: opts.uid,
            sourceStatus: opts.status,
          });

          targetStatus.forEach((status) => {
            idMap.add({
              uid: target,
              documentId: relation.documentId,
              locale: targetLocale,
              status,
            });
          });

          return relation;
        }, value as any);
      }
    },
    { schema: strapi.getModel(opts.uid) },
    data
  );
};

export { extractDataIds };
