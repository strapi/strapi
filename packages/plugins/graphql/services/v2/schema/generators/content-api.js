'use strict';

const { join } = require('path');
const { prop } = require('lodash/fp');
const { makeSchema, unionType, fieldAuthorizePlugin } = require('nexus');

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
  const registry = createTypeRegistry();

  // Register needed scalar types
  Object.entries(scalars).forEach(([name, definition]) => {
    registry.register(name, definition, { kind: 'scalar' });
  });

  // Register Strapi's internal types
  for (const [kind, definitions] of Object.entries(internals)) {
    registry.registerMany(Object.entries(definitions), { kind });
  }

  // Generate and register definitions for every content type
  registerAPITypes(contentTypes, registry);

  // Generate and register polymorphic types' definitions
  registerMorphTypes(contentTypes, registry);

  // Return a brand new Nexus schema
  return makeSchema({
    // Exhaustive list of the content-api's types definitions
    types: registry.definitions,

    // Plugins
    // todo[v4]: Might try to implement RBAC for gql using this plugin (field granularity)
    plugins: [fieldAuthorizePlugin()],

    // Auto-gen tools configuration (.graphql, .ts)
    shouldGenerateArtifacts: process.env.NODE_ENV === 'development',

    outputs: {
      typegen: join(__dirname, '..', 'nexus-typegen.ts'),
      schema: join(__dirname, '..', 'schema.graphql'),
    },
  });
};

const registerAPITypes = (contentTypes, registry) => {
  for (const contentType of contentTypes) {
    const { kind, modelType } = contentType;

    // Generate enums & dynamic zones
    registerEnumsDefinition(registry, contentType);
    registerDynamicZonesDefinition(registry, contentType);
    registerFiltersDefinition(registry, contentType);

    // Generate & register component's definition
    if (modelType === 'component') {
      registerComponent(registry, contentType);
    }

    // Generate & register single type's definition
    else if (kind === 'singleType') {
      registerSingleType(registry, contentType);
    }

    // Generate & register collection type's definition
    else if (kind === 'collectionType') {
      registerCollectionType(registry, contentType);
    }
  }
};

const registerMorphTypes = (contentTypes, registry) => {
  contentTypes.forEach(contentType => {
    const { attributes = {}, modelName, plugin } = contentType;

    const morphAttributes = Object.keys(attributes).filter(attributeName =>
      utils.isMorphRelation(attributes[attributeName])
    );

    /**
     * Filter definitions from the types registry and return definitions
     * which have a relation attribute to the current content type
     *
     * @param {object} config
     * @param {string} config.kind
     * @param {object} config.contentType
     * @return {boolean}
     */
    const backlinksPredicate = ({ config }) => {
      return (
        // Only search for links in base types & components
        ['types', 'components'].includes(config.kind) &&
        // Keep any of the content type where some of its
        // attributes have a relation to the current content type
        Object.values(config.contentType.attributes)
          .filter(utils.isRelation)
          .some(attr => {
            return (attr.model || attr.collection) === modelName && attr.plugin === plugin;
          })
      );
    };

    for (const attributeName of morphAttributes) {
      const name = utils.getMorphRelationTypeName(contentType, attributeName);

      const backLinks = registry.where(backlinksPredicate);

      registry.register(
        name,

        unionType({
          name,

          resolveType(obj) {
            return obj.__typename;
          },

          definition(t) {
            t.members(...backLinks.map(prop('definition')));
          },
        }),

        { kind: 'morphs', contentType, attributeName }
      );
    }
  });
};

const registerComponent = (registry, contentType) => {
  const name = utils.getComponentName(contentType);
  const definition = buildTypeDefinition(name, contentType);

  registry.register(name, definition, { kind: 'components', contentType });
};

const registerSingleType = (registry, contentType) => {
  const types = {
    base: utils.getTypeName(contentType),
    entity: utils.getEntityName(contentType),
    response: utils.getEntityResponseName(contentType),
    queries: utils.getEntityQueriesTypeName(contentType),
  };

  const getConfig = kind => ({ kind, contentType });

  // Single type's definition
  registry.register(types.base, buildTypeDefinition(types.base, contentType), getConfig('types'));

  // Higher level entity definition
  registry.register(
    types.entity,
    buildEntityDefinition(types.entity, contentType),
    getConfig('entities')
  );

  // Responses definition
  registry.register(
    types.response,
    buildResponseDefinition(types.response, contentType),
    getConfig('entitiesResponses')
  );

  // Queries
  registry.register(types.queries, buildSingleTypeQueries(contentType), getConfig('queries'));
};

const registerCollectionType = (registry, contentType) => {
  // Types name (as string)
  const types = {
    base: utils.getTypeName(contentType),
    entity: utils.getEntityName(contentType),
    response: utils.getEntityResponseName(contentType),
    responseCollection: utils.getEntityResponseCollectionName(contentType),
    queries: utils.getEntityQueriesTypeName(contentType),
  };

  const getConfig = kind => ({ kind, contentType });

  // Type definition
  registry.register(types.base, buildTypeDefinition(types.base, contentType), getConfig('types'));

  // Higher level entity definition
  registry.register(
    types.entity,
    buildEntityDefinition(types.entity, contentType),
    getConfig('entities')
  );

  // Responses definition
  registry.register(
    types.response,
    buildResponseDefinition(types.response, contentType),
    getConfig('entitiesResponses')
  );

  registry.register(
    types.responseCollection,
    buildResponseCollectionDefinition(types.responseCollection, contentType),
    getConfig('entitiesResponsesCollection')
  );

  // Query extensions
  registry.register(types.queries, buildCollectionTypeQueries(contentType), getConfig('queries'));
};

const registerEnumsDefinition = (registry, contentType) => {
  const { attributes } = contentType;

  const enumAttributes = Object.keys(attributes).filter(attributeName =>
    utils.isEnumeration(attributes[attributeName])
  );

  for (const attributeName of enumAttributes) {
    const attribute = attributes[attributeName];

    const enumName = utils.getEnumName(contentType, attributeName);
    const enumDefinition = buildEnumTypeDefinition(attribute, enumName);

    registry.register(enumName, enumDefinition, {
      kind: 'enums',
      contentType,
      attributeName,
      attribute,
    });
  }
};

const registerDynamicZonesDefinition = (registry, contentType) => {
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
      const baseConfig = {
        contentType,
        attributeName,
        attribute,
      };

      registry.register(dzName, type, { kind: 'dynamic-zones', ...baseConfig });
      registry.register(dzInputName, input, { kind: 'input', ...baseConfig });
    }
  }
};

const registerFiltersDefinition = (registry, contentType) => {
  const type = utils.getFiltersInputTypeName(contentType);
  const definition = buildContentTypeFilters(contentType);

  registry.register(type, definition, { kind: 'filters-inputs', contentType });
};

module.exports = { buildAPITypes: registerAPITypes, buildAPISchema };
