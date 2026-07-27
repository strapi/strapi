import { clone, curry } from 'lodash/fp';

import type { Attribute, AnyAttribute, Model, Data } from './types';
import { isRelationalAttribute, isMediaAttribute } from './content-types';

/**
 * Execute promises in parallel but throw errors in array index order.
 */
const parallelWithOrderedErrors = async <T>(promises: Promise<T>[]): Promise<T[]> => {
  const results = await Promise.allSettled(promises);

  // Throw first error in array index order (matches sequential behavior)
  for (let i = 0; i < results.length; i += 1) {
    const result = results[i];
    if (result.status === 'rejected') {
      throw result.reason;
    }
  }

  return results.map((r) => (r as PromiseFulfilledResult<T>).value);
};

/**
 * Native stand-ins for the lodash/fp predicates this module used to call.
 *
 * They run once per key (and several times per node) so the wrapper overhead was
 * measurable. Semantics are deliberately identical: `isNil` is a loose null check,
 * `isObject` matches lodash in treating functions as objects and `null` as not one.
 */
const isNil = (value: unknown): boolean => value == null;
const isArray = Array.isArray;
const isObject = (value: unknown): boolean => {
  if (value == null) return false;
  const type = typeof value;
  return type === 'object' || type === 'function';
};

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
  /** Extra root-level keys allowed (e.g. registered input params). Only used when path.attribute === null. */
  allowedExtraRootKeys?: string[];
}

export type Visitor = (visitorOptions: VisitorOptions, visitorUtils: VisitorUtils) => void;

export interface Path {
  raw: string | null;
  attribute: string | null;
  rawWithIndices?: string | null;
}

export interface TraverseOptions {
  schema: Model;
  path?: Path;
  parent?: Parent;
  getModel(uid: string): Model;
  /** Extra root-level keys allowed (e.g. registered input params). Only used when path.attribute === null. */
  allowedExtraRootKeys?: string[];
}

export interface Parent {
  attribute?: Attribute;
  key: string | null;
  path: Path;
  schema: Model;
}

const traverseEntity = async (
  visitor: Visitor,
  options: TraverseOptions,
  entity: Data
): Promise<Data> => {
  const {
    path = { raw: null, attribute: null, rawWithIndices: null },
    schema,
    getModel,
    allowedExtraRootKeys,
  } = options;

  let parent = options.parent;

  const traverseMorphRelationTarget = async (visitor: Visitor, path: Path, entry: Data) => {
    const targetSchema = getModel(entry.__type!);

    const traverseOptions: TraverseOptions = {
      schema: targetSchema,
      path,
      getModel,
      parent,
      allowedExtraRootKeys,
    };

    return traverseEntity(visitor, traverseOptions, entry);
  };

  const traverseRelationTarget =
    (schema: Model) => async (visitor: Visitor, path: Path, entry: Data) => {
      const traverseOptions: TraverseOptions = {
        schema,
        path,
        getModel,
        parent,
        allowedExtraRootKeys,
      };

      return traverseEntity(visitor, traverseOptions, entry);
    };

  const traverseMediaTarget = async (visitor: Visitor, path: Path, entry: Data) => {
    const targetSchemaUID = 'plugin::upload.file';
    const targetSchema = getModel(targetSchemaUID);

    const traverseOptions: TraverseOptions = {
      schema: targetSchema,
      path,
      getModel,
      parent,
      allowedExtraRootKeys,
    };

    return traverseEntity(visitor, traverseOptions, entry);
  };

  const traverseComponent = async (visitor: Visitor, path: Path, schema: Model, entry: Data) => {
    const traverseOptions: TraverseOptions = {
      schema,
      path,
      getModel,
      parent,
      allowedExtraRootKeys,
    };

    return traverseEntity(visitor, traverseOptions, entry);
  };

  const visitDynamicZoneEntry = async (visitor: Visitor, path: Path, entry: Data) => {
    // A dynamic zone array can contain a `null` entry (for example a relation
    // created inline inside a dynamic zone component can leave a null item).
    // Reading `__component` on it crashed traversal; pass nil entries through
    // untouched, consistent with how `traverseEntity` ends recursion on nil. (#24303)
    if (isNil(entry)) {
      return entry;
    }

    const targetSchema = getModel(entry.__component!);
    const traverseOptions: TraverseOptions = {
      schema: targetSchema,
      path,
      getModel,
      parent,
      allowedExtraRootKeys,
    };

    return traverseEntity(visitor, traverseOptions, entry);
  };

  // End recursion
  if (!isObject(entity) || isNil(schema)) {
    return entity;
  }

  // Don't mutate the original entity object
  // only clone at 1st level as the next level will get clone when traversed
  const copy = shallowCopy(entity);

  // Removals are recorded rather than applied with `delete`. Deleting a property moves
  // the object into dictionary mode, which then costs on every subsequent read — and
  // sanitization reads every remaining key immediately afterwards to recurse, before the
  // object is returned and serialized. Instead the key is blanked (so a visitor reading
  // it still sees `undefined`, as it did when deleted) and dropped when the result is
  // assembled below.
  const removedKeys = new Set<string>();
  const visitorUtils = createVisitorUtils({ data: copy, removedKeys });

  const keys = Object.keys(copy);
  for (let i = 0; i < keys.length; i += 1) {
    const key = keys[i];
    // Retrieve the attribute definition associated to the key from the schema
    const attribute = schema.attributes[key] as AnyAttribute | undefined;

    // `attribute` is only appended to the attribute path when the key maps to one;
    // otherwise the parent's value carries through unchanged.
    let attributePath = path.attribute;
    if (attribute != null) {
      attributePath = path.attribute == null ? key : `${path.attribute}.${key}`;
    }

    // Built as a single literal rather than a spread followed by assignments. The spread
    // produced an object whose hidden class then transitioned on each write; a literal
    // with all three fields is one allocation in a shape V8 can keep monomorphic across
    // every key of every entity.
    const newPath: Path = {
      raw: path.raw == null ? key : `${path.raw}.${key}`,
      attribute: attributePath,
      rawWithIndices: path.rawWithIndices == null ? key : `${path.rawWithIndices}.${key}`,
    };

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
      allowedExtraRootKeys,
    };

    await visitor(visitorOptions, visitorUtils);

    // Extract the value for the current key (after calling the visitor)
    const value = copy[key];

    // Ignore Nil values or attributes
    if (isNil(value) || isNil(attribute)) {
      continue;
    }

    if (isRelationalAttribute(attribute)) {
      parent = { schema, key, attribute, path: newPath };
      const isMorphRelation = attribute.relation.toLowerCase().startsWith('morph');

      const method = isMorphRelation
        ? traverseMorphRelationTarget
        : traverseRelationTarget(getModel(attribute.target!));

      if (isArray(value)) {
        // Process array items in parallel with ordered error handling
        copy[key] = await parallelWithOrderedErrors(
          value.map((item, i) => {
            const arrayPath = {
              ...newPath,
              rawWithIndices: isNil(newPath.rawWithIndices)
                ? `${i}`
                : `${newPath.rawWithIndices}.${i}`,
            };
            return method(visitor, arrayPath, item);
          })
        );
      } else {
        copy[key] = await method(visitor, newPath, value as Data);
      }

      continue;
    }

    if (isMediaAttribute(attribute)) {
      parent = { schema, key, attribute, path: newPath };

      if (isArray(value)) {
        // Process media array items in parallel with ordered error handling
        copy[key] = await parallelWithOrderedErrors(
          value.map((item, i) => {
            const arrayPath = {
              ...newPath,
              rawWithIndices: isNil(newPath.rawWithIndices)
                ? `${i}`
                : `${newPath.rawWithIndices}.${i}`,
            };
            return traverseMediaTarget(visitor, arrayPath, item);
          })
        );
      } else {
        copy[key] = await traverseMediaTarget(visitor, newPath, value as Data);
      }

      continue;
    }

    if (attribute.type === 'component') {
      parent = { schema, key, attribute, path: newPath };
      const targetSchema = getModel(attribute.component);

      if (isArray(value)) {
        // Process component array items in parallel with ordered error handling
        copy[key] = await parallelWithOrderedErrors(
          value.map((item, i) => {
            const arrayPath = {
              ...newPath,
              rawWithIndices: isNil(newPath.rawWithIndices)
                ? `${i}`
                : `${newPath.rawWithIndices}.${i}`,
            };
            return traverseComponent(visitor, arrayPath, targetSchema, item);
          })
        );
      } else {
        copy[key] = await traverseComponent(visitor, newPath, targetSchema, value as Data);
      }

      continue;
    }

    if (attribute.type === 'dynamiczone' && isArray(value)) {
      parent = { schema, key, attribute, path: newPath };

      // Process dynamic zone items in parallel with ordered error handling
      copy[key] = await parallelWithOrderedErrors(
        value.map((item, i) => {
          const arrayPath = {
            ...newPath,
            rawWithIndices: isNil(newPath.rawWithIndices)
              ? `${i}`
              : `${newPath.rawWithIndices}.${i}`,
          };
          return visitDynamicZoneEntry(visitor, arrayPath, item);
        })
      );

      continue;
    }
  }

  // Nothing was removed, so the working copy is already the result.
  if (removedKeys.size === 0) {
    return copy;
  }

  return omitKeys(copy, removedKeys);
};

/**
 * Shallow copy preserving the shape lodash's `clone` produced.
 *
 * Arrays and plain objects are copied natively. Anything else — Date, RegExp, a class
 * instance — falls back to lodash so exotic values keep their prototype and internal
 * slots, which a spread would silently discard.
 */
const shallowCopy = (entity: Data): Data => {
  if (isArray(entity)) {
    return entity.slice() as unknown as Data;
  }

  if (Object.getPrototypeOf(entity) === Object.prototype) {
    return { ...entity };
  }

  return clone(entity);
};

/** Rebuild without the removed keys, producing a fresh object in fast-properties mode. */
const omitKeys = (source: Data, removedKeys: Set<string>): Data => {
  if (isArray(source)) {
    // Removing an array index used to `delete` it, leaving a hole and keeping `length`
    // unchanged. Filtering instead would renumber the remaining elements, so the delete
    // is kept here. The built-in visitors never remove an index — an index has no
    // matching attribute, so every visitor returns early — which makes this a cold path
    // not worth optimizing at the cost of changing its semantics.
    for (const key of removedKeys) {
      delete (source as unknown as Record<string, unknown>)[key];
    }
    return source;
  }

  const result: Data = {};
  const keys = Object.keys(source);

  for (let i = 0; i < keys.length; i += 1) {
    const key = keys[i];
    if (!removedKeys.has(key)) {
      result[key] = source[key];
    }
  }

  return result;
};

const createVisitorUtils = ({ data, removedKeys }: { data: Data; removedKeys: Set<string> }) => ({
  remove(key: string) {
    removedKeys.add(key);
    // Blanked rather than deleted so a visitor that reads the key afterwards observes
    // `undefined`, exactly as it did when this was a `delete`.
    data[key] = undefined;
  },

  set(key: string, value: Data) {
    removedKeys.delete(key);
    data[key] = value;
  },
});

export default curry(traverseEntity);
