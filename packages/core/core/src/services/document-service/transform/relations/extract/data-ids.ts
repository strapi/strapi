import { isObject } from 'lodash/fp';
import { EntityService, Attribute, Common } from '@strapi/types';
import { traverseEntity } from '@strapi/utils';
import { IdMap } from '../../id-map';
import { ShortHand, LongHand, ID } from '../utils/types';
import { isShortHand, isLongHand } from '../utils/data';

/**
 *  Get relation ids from primitive representation (id, id[], {id}, {id}[])
 */
const handlePrimitive = (
  relation: ShortHand | LongHand | ShortHand[] | LongHand[] | null | undefined | any
) => {
  if (!relation) return []; // null
  if (isShortHand(relation)) return [relation]; // id
  if (isLongHand(relation)) return [relation.id]; // { id }
  if (Array.isArray(relation)) return relation.map((item) => (isShortHand(item) ? item : item.id)); // id[]

  return [];
};

/**
 * Get all relations document ids from a relation input value
 */
const extractRelationIds = <T extends Attribute.RelationKind.Any>(
  relation: EntityService.Params.Attribute.RelationInputValue<T>
): ID[] => {
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
    connect.forEach((item) => {
      if (isShortHand(item) || !('position' in item)) return;

      // { connect: { id: id, position: { before: id } } }
      if (item.position?.before) {
        ids.push(...handlePrimitive(item.position.before));
      }

      // { connect: { id: id, position: { after: id } } }
      if (item.position?.after) {
        ids.push(...handlePrimitive(item.position.after));
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
  opts: { uid: Common.UID.Schema; locale: string; isDraft: boolean }
) => {
  return traverseEntity(
    ({ value, attribute }) => {
      // Find relational attributes, and return the document ids
      if (attribute.type === 'relation') {
        const extractedIds = extractRelationIds(value as any);
        const target = attribute.target;

        // TODO: Handle morph relations (they have multiple targets)
        if (!target) return;

        extractedIds.forEach((id) => idMap.add(target, id as string, opts.locale));
      }
    },
    { schema: strapi.getModel(opts.uid) },
    data
  );
};

export { extractDataIds };
