'use strict';

const {
  curry,
  isString,
  isArray,
  eq,
  constant,
  split,
  isObject,
  trim,
  isNil,
  cloneDeep,
  join,
  first,
} = require('lodash/fp');

const traverseFactory = require('./factory');

const isKeyword =
  (keyword) =>
  ({ key, attribute }) => {
    return !attribute && keyword === key;
  };
const isStringArray = (value) => isArray(value) && value.every(isString);

const populate = traverseFactory()
  // Array of strings ['foo', 'foo.bar'] => map(recurse), then filter out empty items
  .intercept(isStringArray, async (visitor, options, populate, { recurse }) => {
    return Promise.all(populate.map((nestedPopulate) => recurse(visitor, options, nestedPopulate)));
  })
  // Return wildcards as is
  .intercept(eq('*'), constant('*'))
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
  })
  // Parse object values
  .parse(isObject, () => ({
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
  }))
  .ignore(({ key, attribute }) => {
    return ['sort', 'filters', 'fields'].includes(key) && !attribute;
  })
  .on(
    // Handle recursion on populate."populate"
    isKeyword('populate'),
    async ({ key, visitor, path, value, schema }, { set, recurse }) => {
      const newValue = await recurse(visitor, { schema, path }, value);

      set(key, newValue);
    }
  )
  .on(isKeyword('on'), async ({ key, visitor, path, value }, { set, recurse }) => {
    const newOn = {};

    for (const [uid, subPopulate] of Object.entries(value)) {
      const model = strapi.getModel(uid);
      const newPath = { ...path, raw: `${path.raw}[${uid}]` };

      const newSubPopulate = await recurse(visitor, { schema: model, path: newPath }, subPopulate);

      newOn[uid] = newSubPopulate;
    }

    set(key, newOn);
  })
  // Handle populate on relation
  .onRelation(async ({ key, value, attribute, visitor, path, schema }, { set, recurse }) => {
    const isMorphRelation = attribute.relation.toLowerCase().startsWith('morph');

    if (isMorphRelation) {
      // Don't traverse values that cannot be parsed
      if (!isObject(value) || !isObject(value?.on)) {
        return;
      }

      // If there is a populate fragment defined, traverse it
      const newValue = await recurse(visitor, { schema, path }, { on: value.on });

      set(key, { on: newValue });
    }

    const targetSchemaUID = attribute.target;
    const targetSchema = strapi.getModel(targetSchemaUID);

    const newValue = await recurse(visitor, { schema: targetSchema, path }, value);

    set(key, newValue);
  })
  // Handle populate on media
  .onMedia(async ({ key, path, visitor, value }, { recurse, set }) => {
    const targetSchemaUID = 'plugin::upload.file';
    const targetSchema = strapi.getModel(targetSchemaUID);

    const newValue = await recurse(visitor, { schema: targetSchema, path }, value);

    set(key, newValue);
  })
  // Handle populate on components
  .onComponent(async ({ key, value, visitor, path, attribute }, { recurse, set }) => {
    const targetSchema = strapi.getModel(attribute.component);

    const newValue = await recurse(visitor, { schema: targetSchema, path }, value);

    set(key, newValue);
  })
  // Handle populate on dynamic zones
  .onDynamicZone(async ({ key, value, attribute, schema, visitor, path }, { set, recurse }) => {
    if (isObject(value)) {
      const { components } = attribute;
      const { on, ...properties } = value;

      const newValue = {};

      // Handle legacy DZ params
      let newProperties = properties;

      for (const componentUID of components) {
        const componentSchema = strapi.getModel(componentUID);
        newProperties = await recurse(visitor, { schema: componentSchema, path }, newProperties);
      }

      Object.assign(newValue, newProperties);

      // Handle new morph fragment syntax
      if (on) {
        const newOn = await recurse(visitor, { schema, path }, { on });

        // Recompose both syntaxes
        Object.assign(newValue, newOn);
      }

      set(key, newValue);
    } else {
      const newValue = await recurse(visitor, { schema, path }, value);

      set(key, newValue);
    }
  });

module.exports = curry(populate.traverse);
