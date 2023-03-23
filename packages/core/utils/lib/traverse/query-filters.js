'use strict';

const { curry, isObject, isEmpty, isArray, isNil, cloneDeep } = require('lodash/fp');

const traverseFactory = require('./factory');

const filters = traverseFactory()
  .intercept(
    // Intercept filters arrays and apply the traversal to each one individually
    isArray,
    async (visitor, options, filters, { recurse }) => {
      return Promise.all(
        filters.map((filter, i) => {
          // In filters, only operators such as $and, $in, $notIn or $or and implicit operators like [...]
          // can have a value array, thus we can update the raw path but not the attribute one
          const newPath = { ...options.path, raw: `${options.path.raw}[${i}]` };

          return recurse(visitor, { ...options, path: newPath }, filter);
        })
        // todo: move that to the visitors
      ).then((res) => res.filter((val) => !(isObject(val) && isEmpty(val))));
    }
  )
  .intercept(
    // Ignore non object filters and return the value as-is
    (filters) => !isObject(filters),
    (_, __, filters) => {
      return filters;
    }
  )
  // Parse object values
  .parse(
    (value) => typeof value === 'object',
    () => ({
      transform: cloneDeep,

      remove(key, data) {
        const { [key]: ignored, ...rest } = data;

        return rest;
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
    })
  )
  // Ignore null or undefined values
  .ignore(({ value }) => isNil(value))
  // Recursion on operators (non attributes)
  .on(
    ({ attribute }) => isNil(attribute),
    async ({ key, visitor, path, value, schema }, { set, recurse }) => {
      set(key, await recurse(visitor, { schema, path }, value));
    }
  )
  // Handle relation recursion
  .onRelation(async ({ key, attribute, visitor, path, value }, { set, recurse }) => {
    const isMorphRelation = attribute.relation.toLowerCase().startsWith('morph');

    if (isMorphRelation) {
      return;
    }

    const targetSchemaUID = attribute.target;
    const targetSchema = strapi.getModel(targetSchemaUID);

    const newValue = await recurse(visitor, { schema: targetSchema, path }, value);

    set(key, newValue);
  })
  .onComponent(async ({ key, attribute, visitor, path, value }, { set, recurse }) => {
    const targetSchema = strapi.getModel(attribute.component);

    const newValue = await recurse(visitor, { schema: targetSchema, path }, value);

    set(key, newValue);
  })
  // Handle media recursion
  .onMedia(async ({ key, visitor, path, value }, { set, recurse }) => {
    const targetSchemaUID = 'plugin::upload.file';
    const targetSchema = strapi.getModel(targetSchemaUID);

    const newValue = await recurse(visitor, { schema: targetSchema, path }, value);

    set(key, newValue);
  });

module.exports = curry(filters.traverse);
