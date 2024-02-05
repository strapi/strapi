import { EntityService, Attribute, Common } from '@strapi/types';
import { traverseEntity } from '@strapi/utils';
import { isObject, isNil } from 'lodash/fp';
import { ShortHand, LongHand, ID, GetId } from '../utils/types';
import { isShortHand, isLongHand } from '../utils/data';
import { IdMap } from '../../id-map';

const isNumeric = (value: any): value is number => {
  const parsed = parseInt(value, 10);
  return !Number.isNaN(parsed);
};

const transformPrimitive = <T extends ShortHand | LongHand>(
  relation: T | T[] | null | undefined,
  getId: GetId
): T | T[] | undefined => {
  // If id value is a number, return it as is, it's already an entry id
  if (isNumeric(relation)) {
    return relation;
  }

  // null
  if (isNil(relation)) {
    return relation as T | undefined;
  }

  // id
  if (isShortHand(relation)) {
    return getId(relation) as T;
  }

  // { id }
  if (isLongHand(relation)) {
    // It's already an entry id
    if (isNumeric(relation.id)) return relation;

    const id = getId(relation.id) as T;

    // If the id is not found, return undefined
    if (!id) return undefined;

    return { ...(relation as object), id: getId(relation.id) } as T;
  }

  // id[]
  if (Array.isArray(relation)) {
    return relation.map((item) => transformPrimitive(item, getId)).filter(Boolean) as T[];
  }
  return undefined;
};

const transformRelationIdsVisitor = <T extends Attribute.RelationKind.Any>(
  // @ts-expect-error - TODO: Fix this

  relation: EntityService.Params.Attribute.RelationInputValue<T>,
  getId: GetId
  // @ts-expect-error - TODO: Fix this
): EntityService.Params.Attribute.RelationInputValue<T> => {
  const map = transformPrimitive(relation as any, getId);
  if (map) return map;

  if (!isObject(relation)) return relation;

  // set: id[]
  // what if result of mapPrimitive is undefined?
  if ('set' in relation) {
    relation.set = transformPrimitive(relation.set as any, getId);
  }
  if ('disconnect' in relation) {
    relation.disconnect = transformPrimitive(relation.disconnect as any, getId);
  }

  if ('connect' in relation) {
    // connect: id[] | { id } | ...
    relation.connect = transformPrimitive(relation.connect as any, getId);

    const mapPosition = (item: any) => {
      if (isShortHand(item) || !('position' in item)) return item;

      // { connect: { id: id, position: { before: id } } }
      if (item.position?.before) {
        item.position.before = transformPrimitive(item.position.before, getId);
      }

      // { connect: { id: id, position: { after: id } } }
      if (item.position?.after) {
        item.position.after = transformPrimitive(item.position.after, getId);
      }

      return item;
    };

    if (Array.isArray(relation.connect)) {
      relation.connect = relation.connect.map(mapPosition);
    } else {
      relation.connect = mapPosition(relation.connect);
    }
  }

  return relation;
};

const EXCLUDED_FIELDS = [
  'createdBy',
  'updatedBy',
  'localizations',
  'strapi_stage',
  'strapi_assignee',
];

const transformDataIdsVisitor = (
  idMap: IdMap,
  data: Record<string, any>,
  opts: {
    uid: Common.UID.Schema;
    locale?: string | null;
    isDraft?: boolean;
    throwOnMissingId?: boolean; // Wether to throw an error if an id is not found
  }
) => {
  return traverseEntity(
    ({ key, value, attribute }, { set }) => {
      // Find relational attributes, and return the document ids
      if (attribute.type === 'relation') {
        const target = attribute.target;
        // TODO: Handle polymorphic relations
        if (!target) return;
        // TODO: Handle this differently
        if (EXCLUDED_FIELDS.includes(key)) return;

        const getId = (documentId: ID): ID | null => {
          const entryId = idMap.get({
            uid: target,
            documentId: documentId as string,
            locale: opts.locale,
            isDraft: opts.isDraft,
          });

          if (entryId) return entryId;
          if (opts.throwOnMissingId === false) return null;

          throw new Error(`Document with id "${documentId}" not found`);
        };

        const newRelation = transformRelationIdsVisitor(value as any, getId);
        set(key, newRelation as any);
      }
    },
    { schema: strapi.getModel(opts.uid) },
    data
  );
};

export { transformDataIdsVisitor };
