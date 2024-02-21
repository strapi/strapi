import { isObject } from 'lodash/fp';
import { EntityService, Attribute, Common } from '@strapi/types';
import { traverseEntity } from '@strapi/utils';
import { IdMap } from '../../id-map';
import { ShortHand, LongHand, ID } from '../utils/types';
import { isShortHand, isLongHand } from '../utils/data';
import { getRelationTargetLocale } from '../utils/i18n';

type ExtractedId = { id: ID; locale?: string };

/**
 *  Get relation ids from primitive representation (id, id[], {id}, {id}[])
 */
const handlePrimitive = (
  relation: ShortHand | LongHand | ShortHand[] | LongHand[] | null | undefined | any
): LongHand[] => {
  if (!relation) {
    return []; // null
  }
  if (isShortHand(relation)) {
    return [{ id: relation }]; // id
  }
  if (isLongHand(relation)) {
    // @ts-expect-error - TODO: Add relation type
    return [{ id: relation.id, locale: relation.locale }]; // { id, locale? }
  }
  if (Array.isArray(relation)) {
    return relation.map((item) => (isShortHand(item) ? { id: item } : item)); // id[]
  }

  return [];
};

/**
 * Get all relations document ids from a relation input value
 */
const extractRelationIds = <T extends Attribute.RelationKind.Any>(
  relation: EntityService.Params.Attribute.RelationInputValue<T>
): ExtractedId[] => {
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
        ids.push(...handlePrimitive({ ...position, id: position.before }));
      }

      // { connect: { id: id, position: { after: id } } }
      if (position?.after) {
        ids.push(...handlePrimitive({ ...position, id: position.after }));
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
  opts: { uid: Common.UID.Schema; locale?: string | null; isDraft?: boolean }
) => {
  return traverseEntity(
    ({ value, attribute }) => {
      // Find relational attributes, and return the document ids
      if (attribute.type === 'relation') {
        const extractedIds = extractRelationIds(value as any);

        // TODO: Handle morph relations (they have multiple targets)
        const target = attribute.target;
        if (!target) return;

        extractedIds.forEach((relation) => {
          idMap.add({
            uid: target,
            documentId: relation.id as string,
            locale: getRelationTargetLocale(relation, {
              targetUid: target as Common.UID.Schema,
              sourceUid: opts.uid,
              sourceLocale: opts.locale,
            }),
            isDraft: opts.isDraft,
          });
        });
      }
    },
    { schema: strapi.getModel(opts.uid) },
    data
  );
};

export { extractDataIds };
