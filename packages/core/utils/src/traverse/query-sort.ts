import {
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
} from 'lodash/fp';

import traverseFactory from './factory';

const ORDERS = { asc: 'asc', desc: 'desc' };
const ORDER_VALUES = Object.values(ORDERS);

const isSortOrder = (value: string) => ORDER_VALUES.includes(value.toLowerCase());
const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every(isString);
const isObjectArray = (value: unknown): value is object[] =>
  Array.isArray(value) && value.every(isObject);
const isNestedSorts = (value: unknown): value is string =>
  isString(value) && value.split(',').length > 1;

const isObj = (value: unknown): value is Record<string, unknown> => isObject(value);

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
  .parse(isString, () => {
    const tokenize = pipe(split('.'), map(split(':')), flatten);
    const recompose = (parts: string[]) => {
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
        const v = first(tokenize(data));
        return v ? [v] : [];
      },

      get(key, data) {
        const [root, ...rest] = tokenize(data);

        return key === root ? recompose(rest) : undefined;
      },
    };
  })
  // Parse object values
  .parse(isObj, () => ({
    transform: cloneDeep,

    remove(key, data) {
      // eslint-disable-next-line no-unused-vars
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
  }))
  // Handle deep sort on relation
  .onRelation(async ({ key, value, attribute, visitor, path, getModel }, { set, recurse }) => {
    const isMorphRelation = attribute.relation.toLowerCase().startsWith('morph');

    if (isMorphRelation) {
      return;
    }

    const targetSchemaUID = attribute.target;
    const targetSchema = getModel(targetSchemaUID!);

    const newValue = await recurse(visitor, { schema: targetSchema, path, getModel }, value);

    set(key, newValue);
  })
  // Handle deep sort on media
  .onMedia(async ({ key, path, visitor, value, getModel }, { recurse, set }) => {
    const targetSchemaUID = 'plugin::upload.file';
    const targetSchema = getModel(targetSchemaUID);

    const newValue = await recurse(visitor, { schema: targetSchema, path, getModel }, value);

    set(key, newValue);
  })
  // Handle deep sort on components
  .onComponent(async ({ key, value, visitor, path, attribute, getModel }, { recurse, set }) => {
    const targetSchema = getModel(attribute.component);

    const newValue = await recurse(visitor, { schema: targetSchema, path, getModel }, value);

    set(key, newValue);
  });

export default curry(sort.traverse);
