'use strict';

const {
  curry,
  isString,
  isObject,
  map,
  trim,
  split,
  isEmpty,
  flatten,
  pipe,
  isNil,
  first,
  cloneDeep,
} = require('lodash/fp');

const traverseFactory = require('./factory');

const ORDERS = { asc: 'asc', desc: 'desc' };
const ORDER_VALUES = Object.values(ORDERS);

const isSortOrder = (value) => ORDER_VALUES.includes(value.toLowerCase());
const isStringArray = (value) => Array.isArray(value) && value.every(isString);
const isObjectArray = (value) => Array.isArray(value) && value.every(isObject);
const isNestedSorts = (value) => isString(value) && value.split(',').length > 1;

const sort = traverseFactory()
  .intercept(
    // String with chained sorts (foo,bar,foobar) => split, map(recurse), then recompose
    isNestedSorts,
    async (visitor, options, sort, { recurse }) => {
      return Promise.all(
        sort
          .split(',')
          .map(trim)
          .map((nestedSort) => recurse(visitor, options, nestedSort))
      ).then((res) => res.filter((part) => !isEmpty(part)).join(','));
    }
  )
  .intercept(
    // Array of strings ['foo', 'foo,bar'] => map(recurse), then filter out empty items
    isStringArray,
    async (visitor, options, sort, { recurse }) => {
      return Promise.all(sort.map((nestedSort) => recurse(visitor, options, nestedSort))).then(
        (res) => res.filter((nestedSort) => !isEmpty(nestedSort))
      );
    }
  )
  .intercept(
    // Array of objects [{ foo: 'asc' }, { bar: 'desc', baz: 'asc' }] => map(recurse), then filter out empty items
    isObjectArray,
    async (visitor, options, sort, { recurse }) => {
      return Promise.all(sort.map((nestedSort) => recurse(visitor, options, nestedSort))).then(
        (res) => res.filter((nestedSort) => !isEmpty(nestedSort))
      );
    }
  )
  // Parse string values
  .parse(
    (sort) => typeof sort === 'string',
    () => {
      const tokenize = pipe(split('.'), map(split(':')), flatten);
      const recompose = (parts) => {
        if (parts.length === 0) {
          return undefined;
        }

        return parts.reduce((acc, part) => {
          if (isEmpty(part)) {
            return acc;
          }

          if (acc === '') {
            return part;
          }

          return isSortOrder(part) ? `${acc}:${part}` : `${acc}.${part}`;
        }, '');
      };

      return {
        transform: trim,

        remove(key, data) {
          const [root] = tokenize(data);

          return root === key ? undefined : data;
        },

        set(key, value, data) {
          const [root] = tokenize(data);

          if (root !== key) {
            return data;
          }

          return isNil(value) ? root : `${root}.${value}`;
        },

        keys(data) {
          return [first(tokenize(data))];
        },

        get(key, data) {
          const [root, ...rest] = tokenize(data);

          return key === root ? recompose(rest) : undefined;
        },
      };
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
  // Handle deep sort on relation
  .onRelation(async ({ key, value, attribute, visitor, path }, { set, recurse }) => {
    const isMorphRelation = attribute.relation.toLowerCase().startsWith('morph');

    if (isMorphRelation) {
      return;
    }

    const targetSchemaUID = attribute.target;
    const targetSchema = strapi.getModel(targetSchemaUID);

    const newValue = await recurse(visitor, { schema: targetSchema, path }, value);

    set(key, newValue);
  })
  // Handle deep sort on media
  .onMedia(async ({ key, path, visitor, value }, { recurse, set }) => {
    const targetSchemaUID = 'plugin::upload.file';
    const targetSchema = strapi.getModel(targetSchemaUID);

    const newValue = await recurse(visitor, { schema: targetSchema, path }, value);

    set(key, newValue);
  })
  // Handle deep sort on components
  .onComponent(async ({ key, value, visitor, path, attribute }, { recurse, set }) => {
    const targetSchema = strapi.getModel(attribute.component);

    const newValue = await recurse(visitor, { schema: targetSchema, path }, value);

    set(key, newValue);
  });

module.exports = curry(sort.traverse);
