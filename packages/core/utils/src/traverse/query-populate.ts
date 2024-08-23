import {
  curry,
  isString,
  isArray,
  isEmpty,
  split,
  isObject,
  trim,
  constant,
  isNil,
  identity,
  cloneDeep,
  join,
  first,
} from 'lodash/fp';

import traverseFactory from './factory';
import { Attribute } from '../types';
import { isMorphToRelationalAttribute } from '../content-types';

const isKeyword = (keyword: string) => {
  return ({ key, attribute }: { key: string; attribute: Attribute }) => {
    return !attribute && keyword === key;
  };
};

const isStringArray = (value: unknown): value is string[] =>
  isArray(value) && value.every(isString);

const isObj = (value: unknown): value is Record<string, unknown> => isObject(value);

const populate = traverseFactory()
  // Array of strings ['foo', 'foo.bar'] => map(recurse), then filter out empty items
  .intercept(isStringArray, async (visitor, options, populate, { recurse }) => {
    const visitedPopulate = await Promise.all(
      populate.map((nestedPopulate) => recurse(visitor, options, nestedPopulate))
    );

    return visitedPopulate.filter((item) => !isNil(item));
  })
  // for wildcard, generate custom utilities to modify the values
  .parse(
    (value): value is '*' => value === '*',
    () => ({
      /**
       * Since value is '*', we don't need to transform it
       */
      transform: identity,

      /**
       * '*' isn't a key/value structure, so regardless
       *  of the given key, it returns the data ('*')
       */
      get: (_key, data) => data,

      /**
       * '*' isn't a key/value structure, so regardless
       * of the given `key`, use `value` as the new `data`
       */
      set: (_key, value) => value,

      /**
       * '*' isn't a key/value structure, but we need to simulate at least one to enable
       * the data traversal. We're using '' since it represents a falsy string value
       */
      keys: constant(['']),

      /**
       * Removing '*' means setting it to undefined, regardless of the given key
       */
      remove: constant(undefined),
    })
  )

  // Parse string values
  .parse(isString, () => {
    const tokenize = split('.');
    const recompose = join('.');

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

        return isNil(value) || isEmpty(value) ? root : `${root}.${value}`;
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
  .ignore(({ key, attribute }) => {
    // we don't want to recurse using traversePopulate and instead let
    // the visitors recurse with the appropriate traversal (sort, filters, etc...)
    return ['sort', 'filters', 'fields'].includes(key) && !attribute;
  })
  .on(
    // Handle recursion on populate."populate"
    isKeyword('populate'),
    async ({ key, visitor, path, value, schema, getModel }, { set, recurse }) => {
      const newValue = await recurse(visitor, { schema, path, getModel }, value);

      set(key, newValue);
    }
  )
  .on(isKeyword('on'), async ({ key, visitor, path, value, getModel }, { set, recurse }) => {
    const newOn: Record<string, unknown> = {};

    if (!isObj(value)) {
      return;
    }

    for (const [uid, subPopulate] of Object.entries(value)) {
      const model = getModel(uid);
      const newPath = { ...path, raw: `${path.raw}[${uid}]` };

      newOn[uid] = await recurse(visitor, { schema: model, path: newPath, getModel }, subPopulate);
    }

    set(key, newOn);
  })
  // Handle populate on relation
  .onRelation(
    async ({ key, value, attribute, visitor, path, schema, getModel }, { set, recurse }) => {
      if (isNil(value)) {
        return;
      }

      if (isMorphToRelationalAttribute(attribute)) {
        // Don't traverse values that cannot be parsed
        if (!isObject(value) || !('on' in value && isObject(value?.on))) {
          return;
        }

        // If there is a populate fragment defined, traverse it
        const newValue = await recurse(visitor, { schema, path, getModel }, { on: value?.on });

        set(key, newValue);

        return;
      }

      const targetSchemaUID = attribute.target;
      const targetSchema = getModel(targetSchemaUID!);

      const newValue = await recurse(visitor, { schema: targetSchema, path, getModel }, value);

      set(key, newValue);
    }
  )
  // Handle populate on media
  .onMedia(async ({ key, path, visitor, value, getModel }, { recurse, set }) => {
    if (isNil(value)) {
      return;
    }

    const targetSchemaUID = 'plugin::upload.file';
    const targetSchema = getModel(targetSchemaUID);

    const newValue = await recurse(visitor, { schema: targetSchema, path, getModel }, value);

    set(key, newValue);
  })
  // Handle populate on components
  .onComponent(async ({ key, value, visitor, path, attribute, getModel }, { recurse, set }) => {
    if (isNil(value)) {
      return;
    }

    const targetSchema = getModel(attribute.component);

    const newValue = await recurse(visitor, { schema: targetSchema, path, getModel }, value);

    set(key, newValue);
  })
  // Handle populate on dynamic zones
  .onDynamicZone(async ({ key, value, schema, visitor, path, getModel }, { set, recurse }) => {
    if (isNil(value) || !isObject(value)) {
      return;
    }

    // Handle fragment syntax
    if ('on' in value && value.on) {
      const newOn = await recurse(visitor, { schema, path, getModel }, { on: value.on });

      set(key, newOn);
    }
  });

export default curry(populate.traverse);
