'use strict';

const { cloneDeep, isObject, isArray, isNil, curry } = require('lodash/fp');

const traverseEntity = async (visitor, options, entity) => {
  const { path = null, schema } = options;

  // End recursion
  if (!isObject(entity) || isNil(schema)) {
    return entity;
  }

  // Don't mutate the original entity object
  const copy = cloneDeep(entity);

  for (const key of Object.keys(copy)) {
    // Retrieve the attribute definition associated to the key from the schema
    const attribute = schema.attributes[key];

    // If the attribute doesn't exist within the schema, ignore it
    if (isNil(attribute)) {
      continue;
    }

    const newPath = path ? `${path}.${key}` : key;

    // Visit the current attribute
    const visitorOptions = { data: copy, schema, key, value: copy[key], attribute, path: newPath };
    const visitorUtils = createVisitorUtils({ data: copy });

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

    if (isRelation) {
      const isMorphRelation = attribute.relation.toLowerCase().startsWith('morph');

      const traverseTarget = entry => {
        // Handle polymorphic relationships
        const targetSchemaUID = isMorphRelation ? entry.__type : attribute.target;
        const targetSchema = strapi.getModel(targetSchemaUID);

        const traverseOptions = { schema: targetSchema, path: newPath };

        return traverseEntity(visitor, traverseOptions, entry);
      };

      // need to update copy
      copy[key] = isArray(value)
        ? await Promise.all(value.map(traverseTarget))
        : await traverseTarget(value);
    }

    if (isComponent) {
      const targetSchema = strapi.getModel(attribute.component);
      const traverseOptions = { schema: targetSchema, path: newPath };

      const traverseComponent = entry => traverseEntity(visitor, traverseOptions, entry);

      copy[key] = isArray(value)
        ? await Promise.all(value.map(traverseComponent))
        : await traverseComponent(value);
    }

    if (isDynamicZone && isArray(value)) {
      const visitDynamicZoneEntry = entry => {
        const targetSchema = strapi.getModel(entry.__component);
        const traverseOptions = { schema: targetSchema, path: newPath };

        return traverseEntity(visitor, traverseOptions, entry);
      };

      copy[key] = await Promise.all(value.map(visitDynamicZoneEntry));
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
