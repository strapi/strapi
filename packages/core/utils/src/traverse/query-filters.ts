import { curry, isObject, isEmpty, isArray, isNil, cloneDeep, omit } from 'lodash/fp';

import traverseFactory from './factory';

const isObj = (value: unknown): value is Record<string, unknown> => isObject(value);

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
    async ({ key, visitor, path, value, schema, getModel }, { set, recurse }) => {
      set(key, await recurse(visitor, { schema, path, getModel }, value));
    }
  )
  // Handle relation recursion
  .onRelation(async ({ key, attribute, visitor, path, value, getModel }, { set, recurse }) => {
    const isMorphRelation = attribute.relation.toLowerCase().startsWith('morph');

    if (isMorphRelation) {
      return;
    }

    const targetSchemaUID = attribute.target;
    const targetSchema = getModel(targetSchemaUID!);

    const newValue = await recurse(visitor, { schema: targetSchema, path, getModel }, value);

    set(key, newValue);
  })
  .onComponent(async ({ key, attribute, visitor, path, value, getModel }, { set, recurse }) => {
    const targetSchema = getModel(attribute.component);

    const newValue = await recurse(visitor, { schema: targetSchema, path, getModel }, value);

    set(key, newValue);
  })
  // Handle media recursion
  .onMedia(async ({ key, visitor, path, value, getModel }, { set, recurse }) => {
    const targetSchemaUID = 'plugin::upload.file';
    const targetSchema = getModel(targetSchemaUID);

    const newValue = await recurse(visitor, { schema: targetSchema, path, getModel }, value);

    set(key, newValue);
  });

export default curry(filters.traverse);
