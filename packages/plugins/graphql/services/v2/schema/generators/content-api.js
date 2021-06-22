'use strict';

const { join } = require('path');
const { makeSchema } = require('nexus');

const {
  buildEntityDefinition,
  buildResponseCollectionDefinition,
  buildResponseDefinition,
  buildTypeDefinition,
  buildEnumTypeDefinition,
  buildDynamicZoneDefinition,
  buildCollectionTypeQueries,
  buildSingleTypeQueries,
  buildContentTypeFilters,
} = require('../builders');
const { utils, scalars, internals } = require('../../types');

const { createTypeRegistry } = require('../type-registry');

const buildAPISchema = contentTypes => {
  const typeRegistry = createTypeRegistry();

  // Generate & assign all needed types

  typeRegistry.registerMany(scalars);
  typeRegistry.registerMany(internals);

  registerAPITypes(contentTypes, typeRegistry);

  // Return a newly built Nexus schema
  return makeSchema({
    // Exhaustive list of the content-api's types
    types: typeRegistry.entries,

    // Generation tools configuration (.graphql, .ts)
    outputs: {
      typegen: join(__dirname, '..', 'nexus-typegen.ts'),
      schema: join(__dirname, '..', 'schema.graphql'),
    },
  });
};

const registerAPITypes = (contentTypes, typeRegistry) => {
  for (const contentType of contentTypes) {
    const { kind, modelType } = contentType;

    // Generate enums & dynamic zones
    registerEnumsDefinition(typeRegistry, contentType);
    registerDynamicZonesDefinition(typeRegistry, contentType);
    registerFiltersDefinition(typeRegistry, contentType);

    // Generate & register component's definition
    if (modelType === 'component') {
      registerComponent(typeRegistry, contentType);
    }

    // Generate & register single type's definition
    else if (kind === 'singleType') {
      registerSingleType(typeRegistry, contentType);
    }

    // Generate & register collection type's definition
    else if (kind === 'collectionType') {
      registerCollectionType(typeRegistry, contentType);
    }
  }
};

const registerComponent = (typeRegistry, component) => {
  const { globalId } = component;

  // const typeDefinition = buildComponentTypeDefinition(component);
  const definition = buildTypeDefinition(globalId, component);

  typeRegistry.register(globalId, definition);
};

const registerSingleType = (typeRegistry, contentType) => {
  const types = {
    base: utils.getTypeName(contentType),
    entity: utils.getEntityName(contentType),
    response: utils.getEntityResponseName(contentType),
    queries: utils.getEntityQueriesTypeName(contentType),
  };

  typeRegistry.registerMany({
    // Single type's definition
    [types.base]: buildTypeDefinition(types.base, contentType),

    // Higher level entity definition
    [types.entity]: buildEntityDefinition(types.entity, contentType),

    // Responses definition
    [types.response]: buildResponseDefinition(types.response, contentType),

    [types.queries]: buildSingleTypeQueries(contentType),
  });
};

const registerCollectionType = (typeRegistry, contentType) => {
  // Types name (as string)
  const types = {
    base: utils.getTypeName(contentType),
    entity: utils.getEntityName(contentType),
    response: utils.getEntityResponseName(contentType),
    responseCollection: utils.getEntityResponseCollectionName(contentType),
    queries: utils.getEntityQueriesTypeName(contentType),
  };

  // Types definition (nexus schemas)
  typeRegistry.registerMany({
    // base type definition
    [types.base]: buildTypeDefinition(types.base, contentType),

    // Higher level entity definition
    [types.entity]: buildEntityDefinition(types.entity, contentType),

    // Responses definition
    [types.response]: buildResponseDefinition(types.response, contentType),
    [types.responseCollection]: buildResponseCollectionDefinition(
      types.responseCollection,
      contentType
    ),

    // Query extensions
    [types.queries]: buildCollectionTypeQueries(contentType),
  });
};

const registerEnumsDefinition = (typeRegistry, contentType) => {
  const { attributes } = contentType;

  const enumAttributes = Object.keys(attributes).filter(attributeName =>
    utils.isEnumeration(attributes[attributeName])
  );

  for (const attributeName of enumAttributes) {
    const attribute = attributes[attributeName];

    const enumName = utils.getEnumName(contentType, attributeName);
    const enumDefinition = buildEnumTypeDefinition(attribute, enumName);

    typeRegistry.register(enumName, enumDefinition);
  }
};

const registerDynamicZonesDefinition = (typeRegistry, contentType) => {
  const { attributes } = contentType;

  const dynamicZoneAttributes = Object.keys(attributes).filter(attributeName =>
    utils.isDynamicZone(attributes[attributeName])
  );

  for (const attributeName of dynamicZoneAttributes) {
    const attribute = attributes[attributeName];
    const dzName = utils.getDynamicZoneName(contentType, attributeName);
    const dzInputName = utils.getDynamicZoneInputName(contentType, attributeName);

    const [type, input] = buildDynamicZoneDefinition(attribute, dzName, dzInputName);

    if (type && input) {
      typeRegistry.registerMany({
        [dzName]: type,
        [dzInputName]: input,
      });
    }
  }
};

const registerFiltersDefinition = (typeRegistry, contentType) => {
  const type = utils.getFiltersInputTypeName(contentType);
  const definition = buildContentTypeFilters(contentType);

  typeRegistry.register(type, definition);
};

module.exports = { buildAPITypes: registerAPITypes, buildAPISchema };
