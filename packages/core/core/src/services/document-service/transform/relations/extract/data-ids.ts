import { isObject } from 'lodash/fp';
import { Modules, Schema, UID } from '@strapi/types';
import { traverseEntity } from '@strapi/utils';
import { IdMap } from '../../id-map';
import { ShortHand, LongHand, LongHandDocument } from '../utils/types';
import { isShortHand, isLongHand } from '../utils/data';
import { getRelationTargetLocale } from '../utils/i18n';
import { getRelationTargetStatus } from '../utils/dp';
/**
 *  Get relation ids from primitive representation (id, id[], {id}, {id}[])
 */
const handlePrimitive = (
  relation: ShortHand | LongHand | ShortHand[] | LongHand[] | null | undefined | any
): LongHandDocument[] => {
  if (!relation) {
    return []; // null
  }

  if (isShortHand(relation)) {
    return [{ documentId: relation }]; // id
  }

  if (isLongHand(relation)) {
    // { documentId, locale? }
    if ('documentId' in relation) {
      return [
        { documentId: relation.documentId, locale: relation.locale, status: relation.status },
      ];
    }
    // { id }
    return [];
  }

  if (Array.isArray(relation)) {
    return relation.map((item) => (isShortHand(item) ? { documentId: item } : item)); // id[]
  }

  return [];
};

/**
 * Get all relations document ids from a relation input value
 */
const extractRelationIds = <T extends Schema.Attribute.RelationKind.Any>(
  relation: Modules.EntityService.Params.Attribute.RelationInputValue<T>
): LongHandDocument[] => {
  const ids = handlePrimitive(relation);
  if (!isObject(relation)) return ids;

  if ('set' in relation) ids.push(...handlePrimitive(relation.set)); // set: id[]
  if ('disconnect' in relation) ids.push(...handlePrimitive(relation.disconnect)); // disconnect: id[]
  if ('connect' in relation) {
    // connect: id[] | { id } | ...
    if (!relation.connect) return [];
    ids.push(...handlePrimitive(relation.connect));

    // handle positional arguments
    const connect = Array.isArray(relation.connect) ? relation.connect : [relation.connect];
    connect.forEach((relation) => {
      if (isShortHand(relation) || !('position' in relation)) return;

      const { position } = relation;

      // { connect: { id: id, position: { before: id } } }
      if (position?.before) {
        ids.push(...handlePrimitive({ ...position, documentId: position.before }));
      }

      // { connect: { id: id, position: { after: id } } }
      if (position?.after) {
        ids.push(...handlePrimitive({ ...position, documentId: position.after }));
      }
    });
  }

  return ids;
};

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
    ({ value, attribute }) => {
      // Find relational attributes, and return the document ids
      if (attribute.type === 'relation') {
        const extractedIds = extractRelationIds(value as any);

        // TODO: Handle morph relations (they have multiple targets)
        const target = attribute.target;
        if (!target) return;

        // If not connecting to any version on disabled d&p, we should connect to both draft and published relations at the same time
        extractedIds.forEach((relation) => {
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
        });
      }
    },
    { schema: strapi.getModel(opts.uid), getModel: strapi.getModel.bind(strapi) },
    data
  );
};

export { extractDataIds };
