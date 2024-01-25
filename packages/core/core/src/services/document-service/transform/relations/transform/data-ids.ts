import { EntityService, Attribute, Common } from '@strapi/types';
import { errors, traverseEntity } from '@strapi/utils';
import { isObject, isNil } from 'lodash/fp';
import { ShortHand, LongHand, ID, GetIdOrThrow } from '../utils/types';
import { isShortHand, isLongHand } from '../utils/data';
import { IdMap } from '../../id-map';

const transformPrimitive = <T extends ShortHand | LongHand>(
  relation: T | T[] | null | undefined,
  getId: GetIdOrThrow
): T | T[] | undefined => {
  // null
  if (isNil(relation)) return relation as T | undefined;
  // id
  if (isShortHand(relation)) return getId(relation) as T;
  // { id }
  if (isLongHand(relation)) return { ...(relation as object), id: getId(relation.id) } as T;
  // id[]
  if (Array.isArray(relation))
    return relation.map((item) => transformPrimitive(item, getId)) as T[];
  return undefined;
};

const transformRelationIdsVisitor = <T extends Attribute.RelationKind.Any>(
  relation: EntityService.Params.Attribute.RelationInputValue<T>,
  getId: GetIdOrThrow
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

const EXCLUDED_FIELDS = ['createdBy', 'updatedBy', 'localizations', 'strapi_stage'];

const transformDataIdsVisitor = (
  idMap: IdMap,
  data: Record<string, any>,
  opts: { uid: Common.UID.Schema; locale?: string | null; isDraft: boolean }
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

        const getIdOrThrow = (documentId: ID): ID => {
          const entryId = idMap.get(target, documentId as string, opts.locale);
          if (entryId) return entryId;
          throw new errors.NotFoundError(`Document with id "${documentId}" not found`);
        };

        const newRelation = transformRelationIdsVisitor(value as any, getIdOrThrow);
        set(key, newRelation as any);
      }
    },
    { schema: strapi.getModel(opts.uid) },
    data
  );
};

export { transformDataIdsVisitor };
