import { clone, isObject, isArray, isNil, curry } from 'lodash/fp';

import type { AnyAttribute, Model, Data } from './types';
import { isRelationalAttribute, isMediaAttribute } from './content-types';

export type VisitorUtils = ReturnType<typeof createVisitorUtils>;

export interface VisitorOptions {
  data: Record<string, unknown>;
  schema: Model;
  key: string;
  value: Data[keyof Data];
  attribute?: AnyAttribute;
  path: Path;
  getModel(uid: string): Model;
  parent?: Parent;
}

export type Visitor = (visitorOptions: VisitorOptions, visitorUtils: VisitorUtils) => void;

export interface Path {
  raw: string | null;
  attribute: string | null;
}

export interface TraverseOptions {
  schema: Model;
  path?: Path;
  parent?: Parent;
  getModel(uid: string): Model;
}

export interface Parent {
  path: Path;
  schema?: Model;
  key?: string;
  attribute?: AnyAttribute;
}

const traverseEntity = async (visitor: Visitor, options: TraverseOptions, entity: Data) => {
  const { path = { raw: null, attribute: null }, schema, getModel } = options;

  let parent = options.parent;

  const traverseMorphRelationTarget = async (visitor: Visitor, path: Path, entry: Data) => {
    const targetSchema = getModel(entry.__type!);

    const traverseOptions: TraverseOptions = { schema: targetSchema, path, getModel, parent };

    return traverseEntity(visitor, traverseOptions, entry);
  };

  const traverseRelationTarget =
    (schema: Model) => async (visitor: Visitor, path: Path, entry: Data) => {
      const traverseOptions: TraverseOptions = { schema, path, getModel, parent };

      return traverseEntity(visitor, traverseOptions, entry);
    };

  const traverseMediaTarget = async (visitor: Visitor, path: Path, entry: Data) => {
    const targetSchemaUID = 'plugin::upload.file';
    const targetSchema = getModel(targetSchemaUID);

    const traverseOptions: TraverseOptions = { schema: targetSchema, path, getModel, parent };

    return traverseEntity(visitor, traverseOptions, entry);
  };

  const traverseComponent = async (visitor: Visitor, path: Path, schema: Model, entry: Data) => {
    const traverseOptions: TraverseOptions = { schema, path, getModel, parent };

    return traverseEntity(visitor, traverseOptions, entry);
  };

  const visitDynamicZoneEntry = async (visitor: Visitor, path: Path, entry: Data) => {
    const targetSchema = getModel(entry.__component!);
    const traverseOptions: TraverseOptions = { schema: targetSchema, path, getModel, parent };

    return traverseEntity(visitor, traverseOptions, entry);
  };

  // End recursion
  if (!isObject(entity) || isNil(schema)) {
    return entity;
  }

  // Don't mutate the original entity object
  // only clone at 1st level as the next level will get clone when traversed
  const copy = clone(entity);
  const visitorUtils = createVisitorUtils({ data: copy });

  const keys = Object.keys(copy);
  for (let i = 0; i < keys.length; i += 1) {
    const key = keys[i];
    // Retrieve the attribute definition associated to the key from the schema
    const attribute = schema.attributes[key] as AnyAttribute | undefined;

    const newPath = { ...path };

    newPath.raw = isNil(path.raw) ? key : `${path.raw}.${key}`;

    if (!isNil(attribute)) {
      newPath.attribute = isNil(path.attribute) ? key : `${path.attribute}.${key}`;
    }

    // Visit the current attribute
    const visitorOptions: VisitorOptions = {
      data: copy,
      schema,
      key,
      value: copy[key],
      attribute,
      path: newPath,
      getModel,
      parent,
    };

    await visitor(visitorOptions, visitorUtils);

    // Extract the value for the current key (after calling the visitor)
    const value = copy[key];

    // Ignore Nil values or attributes
    if (isNil(value) || isNil(attribute)) {
      continue;
    }

    // The current attribute becomes the parent once visited
    parent = { schema, key, attribute, path: newPath };

    if (isRelationalAttribute(attribute)) {
      const isMorphRelation = attribute.relation.toLowerCase().startsWith('morph');

      const method = isMorphRelation
        ? traverseMorphRelationTarget
        : traverseRelationTarget(getModel(attribute.target!));

      if (isArray(value)) {
        const res = new Array(value.length);
        for (let i = 0; i < value.length; i += 1) {
          res[i] = await method(visitor, newPath, value[i]);
        }
        copy[key] = res;
      } else {
        copy[key] = await method(visitor, newPath, value as Data);
      }

      continue;
    }

    if (isMediaAttribute(attribute)) {
      // need to update copy
      if (isArray(value)) {
        const res = new Array(value.length);
        for (let i = 0; i < value.length; i += 1) {
          res[i] = await traverseMediaTarget(visitor, newPath, value[i]);
        }
        copy[key] = res;
      } else {
        copy[key] = await traverseMediaTarget(visitor, newPath, value as Data);
      }

      continue;
    }

    if (attribute.type === 'component') {
      const targetSchema = getModel(attribute.component);

      if (isArray(value)) {
        const res: Data[] = new Array(value.length);
        for (let i = 0; i < value.length; i += 1) {
          res[i] = await traverseComponent(visitor, newPath, targetSchema, value[i]);
        }
        copy[key] = res;
      } else {
        copy[key] = await traverseComponent(visitor, newPath, targetSchema, value as Data);
      }

      continue;
    }

    if (attribute.type === 'dynamiczone' && isArray(value)) {
      const res = new Array(value.length);
      for (let i = 0; i < value.length; i += 1) {
        res[i] = await visitDynamicZoneEntry(visitor, newPath, value[i]);
      }
      copy[key] = res;

      continue;
    }
  }

  return copy;
};

const createVisitorUtils = ({ data }: { data: Data }) => ({
  remove(key: string) {
    delete data[key];
  },

  set(key: string, value: Data) {
    data[key] = value;
  },
});

export default curry(traverseEntity);
