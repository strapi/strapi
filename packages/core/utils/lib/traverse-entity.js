'use strict';

const { clone, isObject, isArray, isNil, curry } = require('lodash/fp');

const traverseMorphRelationTarget = async (visitor, path, entry) => {
  const targetSchema = strapi.getModel(entry.__type);

  const traverseOptions = { schema: targetSchema, path };

  return traverseEntity(visitor, traverseOptions, entry);
};

const traverseRelationTarget = (schema) => async (visitor, path, entry) => {
  const traverseOptions = { schema, path };

  return traverseEntity(visitor, traverseOptions, entry);
};

const traverseMediaTarget = async (visitor, path, entry) => {
  const targetSchemaUID = 'plugin::upload.file';
  const targetSchema = strapi.getModel(targetSchemaUID);

  const traverseOptions = { schema: targetSchema, path };

  return traverseEntity(visitor, traverseOptions, entry);
};

const traverseComponent = async (visitor, path, schema, entry) => {
  const traverseOptions = { schema, path };

  return traverseEntity(visitor, traverseOptions, entry);
};

const visitDynamicZoneEntry = async (visitor, path, entry) => {
  const targetSchema = strapi.getModel(entry.__component);
  const traverseOptions = { schema: targetSchema, path };

  return traverseEntity(visitor, traverseOptions, entry);
};

const traverseEntity = async (visitor, options, entity) => {
  const { path = { raw: null, attribute: null }, schema } = options;

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
    const attribute = schema.attributes[key];

    // If the attribute doesn't exist within the schema, ignore it
    if (isNil(attribute)) {
      continue;
    }

    const newPath = { ...path };

    newPath.raw = isNil(path.raw) ? key : `${path.raw}.${key}`;

    if (!isNil(attribute)) {
      newPath.attribute = isNil(path.attribute) ? key : `${path.attribute}.${key}`;
    }

    // Visit the current attribute
    const visitorOptions = { data: copy, schema, key, value: copy[key], attribute, path: newPath };

    await visitor(visitorOptions, visitorUtils);

    // Extract the value for the current key (after calling the visitor)
    const value = copy[key];

    // Ignore Nil values
    if (isNil(value)) {
      continue;
    }

    const isRelation = attribute.type === 'relation';
    const isComponent = attribute.type === 'component';
    const isDynamicZone = attribute.type === 'dynamiczone';
    const isMedia = attribute.type === 'media';

    if (isRelation) {
      const isMorphRelation = attribute.relation.toLowerCase().startsWith('morph');

      const method = isMorphRelation
        ? traverseMorphRelationTarget
        : traverseRelationTarget(strapi.getModel(attribute.target));

      if (isArray(value)) {
        const res = new Array(value.length);
        for (let i = 0; i < value.length; i += 1) {
          res[i] = await method(visitor, newPath, value[i]);
        }
        copy[key] = res;
      } else {
        copy[key] = await method(visitor, newPath, value);
      }

      continue;
    }

    if (isMedia) {
      // need to update copy
      if (isArray(value)) {
        const res = new Array(value.length);
        for (let i = 0; i < value.length; i += 1) {
          res[i] = await traverseMediaTarget(visitor, newPath, value[i]);
        }
        copy[key] = res;
      } else {
        copy[key] = await traverseMediaTarget(visitor, newPath, value);
      }

      continue;
    }

    if (isComponent) {
      const targetSchema = strapi.getModel(attribute.component);

      if (isArray(value)) {
        const res = new Array(value.length);
        for (let i = 0; i < value.length; i += 1) {
          res[i] = await traverseComponent(visitor, newPath, targetSchema, value[i]);
        }
        copy[key] = res;
      } else {
        copy[key] = await traverseComponent(visitor, newPath, targetSchema, value);
      }

      continue;
    }

    if (isDynamicZone && isArray(value)) {
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

const createVisitorUtils = ({ data }) => ({
  remove(key) {
    delete data[key];
  },

  set(key, value) {
    data[key] = value;
  },
});

module.exports = curry(traverseEntity);
