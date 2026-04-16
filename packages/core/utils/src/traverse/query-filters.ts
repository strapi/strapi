import { curry, isObject, isEmpty, isArray, isNil, cloneDeep, omit } from 'lodash/fp';

import { isScalarAttribute } from '../content-types';
import { isOperator } from '../operators';
import traverseFactory, { type Parent } from './factory';
import type { Model } from '../types';

const isObj = (value: unknown): value is Record<string, unknown> => isObject(value);

/** True if this object should be walked as a filter subtree (operators / attributes), not an opaque operand. */
const isFilterLikeObject = (value: Record<string, unknown>, schema?: Model) =>
  Object.keys(value).some((k) => isOperator(k) || Boolean(schema?.attributes?.[k]));

const filters = traverseFactory()
  .intercept(
    // Intercept filters arrays and apply the traversal to each one individually
    isArray,
    async (visitor, options, filters, { recurse }) => {
      return Promise.all(
        filters.map((filter, i) => {
          // In filters, only operators such as $and, $in, $notIn or $or and implicit operators like [...]
          // can have a value array, thus we can update the raw path but not the attribute one
          const newPath = options.path
            ? { ...options.path, raw: `${options.path.raw}[${i}]` }
            : options.path;

          return recurse(visitor, { ...options, path: newPath }, filter);
        })
        // todo: move that to the visitors
      ).then((res) => res.filter((val) => !(isObject(val) && isEmpty(val))));
    }
  )
  .intercept(
    // Ignore non object filters and return the value as-is
    (filters): filters is unknown => !isObject(filters),
    (_, __, filters) => {
      return filters;
    }
  )
  // Parse object values
  .parse(isObj, () => ({
    transform: cloneDeep,

    remove(key, data) {
      return omit(key, data);
    },

    set(key, value, data) {
      return { ...data, [key]: value };
    },

    keys(data) {
      return Object.keys(data);
    },

    get(key, data) {
      return data[key];
    },
  }))
  // Ignore null or undefined values
  .ignore(({ value }) => isNil(value))
  // Recursion on operators (non attributes)
  .on(
    ({ attribute }) => isNil(attribute),
    async ({ key, visitor, path, value, schema, getModel, attribute }, { set, recurse }) => {
      const parent: Parent = { key, path, schema, attribute };

      // Operator operands that are plain objects (not arrays) are only traversed when they look like
      // filter subtrees (nested operators or schema attributes). Otherwise treat as opaque operands
      // (e.g. GraphQL DateTime / Date for $gt, $null / $notNull booleans, or { $null: { anything } }).
      // Without this, traversing into e.g. { $null: { anything: 'x' } } makes validate throw on "anything".
      // $not is excluded: its value is always a nested filter map, not an opaque scalar operand.
      if (
        isOperator(key) &&
        key !== '$not' &&
        isObj(value) &&
        !isArray(value) &&
        !isFilterLikeObject(value, schema)
      ) {
        set(key, value);
        return;
      }

      set(key, await recurse(visitor, { schema, path, getModel, parent }, value));
    }
  )
  // Handle relation recursion
  .onRelation(
    async ({ key, attribute, visitor, path, value, schema, getModel }, { set, recurse }) => {
      const isMorphRelation = attribute.relation.toLowerCase().startsWith('morph');

      if (isMorphRelation) {
        return;
      }

      const parent: Parent = { key, path, schema, attribute };

      const targetSchemaUID = attribute.target;
      const targetSchema = getModel(targetSchemaUID!);

      const newValue = await recurse(
        visitor,
        { schema: targetSchema, path, getModel, parent },
        value
      );

      set(key, newValue);
    }
  )
  .onComponent(
    async ({ key, attribute, visitor, path, schema, value, getModel }, { set, recurse }) => {
      const parent: Parent = { key, path, schema, attribute };
      const targetSchema = getModel(attribute.component);

      const newValue = await recurse(
        visitor,
        { schema: targetSchema, path, getModel, parent },
        value
      );

      set(key, newValue);
    }
  )
  // Handle media recursion
  .onMedia(async ({ key, visitor, path, schema, attribute, value, getModel }, { set, recurse }) => {
    const parent: Parent = { key, path, schema, attribute };

    const targetSchemaUID = 'plugin::upload.file';
    const targetSchema = getModel(targetSchemaUID);

    const newValue = await recurse(
      visitor,
      { schema: targetSchema, path, getModel, parent },
      value
    );

    set(key, newValue);
  })
  // Scalar fields: recurse into operator maps (e.g. { $contains: 'x' }) so visitors see nested keys.
  .onAttribute(
    ({ attribute, value }) =>
      Boolean(isScalarAttribute(attribute)) && isObj(value) && !isArray(value),
    async ({ key, visitor, path, value, schema, getModel, attribute }, { set, recurse }) => {
      const parent: Parent = { key, path, schema, attribute };

      set(key, await recurse(visitor, { schema, path, getModel, parent }, value));
    }
  );

export default curry(filters.traverse);
