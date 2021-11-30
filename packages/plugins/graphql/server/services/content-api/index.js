'use strict';

const {
  mergeSchemas,
  makeExecutableSchema,
  addResolversToSchema,
} = require('@graphql-tools/schema');
const { pruneSchema } = require('@graphql-tools/utils');
const { makeSchema } = require('nexus');
const { prop, startsWith } = require('lodash/fp');

const { wrapResolvers } = require('./wrap-resolvers');
const {
  registerSingleType,
  registerCollectionType,
  registerComponent,
  registerScalars,
  registerInternals,
  registerPolymorphicContentType,
  contentType: {
    registerEnumsDefinition,
    registerInputsDefinition,
    registerFiltersDefinition,
    registerDynamicZonesDefinition,
  },
} = require('./register-functions');

module.exports = ({ strapi }) => {
  const { service: getGraphQLService } = strapi.plugin('graphql');
  const { config } = strapi.plugin('graphql');

  const { KINDS, GENERIC_MORPH_TYPENAME } = getGraphQLService('constants');
  const extensionService = getGraphQLService('extension');

  // Type Registry
  let registry;
  // Builders Instances
  let builders;

  const buildSchema = () => {
    const isShadowCRUDEnabled = !!config('shadowCRUD');

    // Create a new empty type registry
    registry = getGraphQLService('type-registry').new();

    // Reset the builders instances associated to the
    // content-api, and link the new type registry
    builders = getGraphQLService('builders').new('content-api', registry);

    registerScalars({ registry, strapi });
    registerInternals({ registry, strapi });

    if (isShadowCRUDEnabled) {
      shadowCRUD();
    }

    // Build a collection of schema based on the type registry (& temporary generated extension)
    const schemas = buildSchemas({ registry });

    // Merge every created schema into a single one
    const mergedSchema = mergeSchemas({ schemas });

    // Generate the extension configuration for the content API.
    // This extension instance needs to be generated after the Nexus schema's
    // generation, so that configurations created during types definitions
    // can be registered before being used in the wrap resolvers operation
    const extension = extensionService.generate({ typeRegistry: registry });

    // Add the extension's resolvers to the final schema
    const schema = addResolversToSchema(mergedSchema, extension.resolvers);

    // Wrap resolvers if needed (auth, middlewares, policies...) as configured in the extension
    const wrappedSchema = wrapResolvers({ schema, strapi, extension });

    // Prune schema, remove unused types
    // eg: removes registered subscriptions if they're disabled in the config)
    const prunedSchema = pruneSchema(wrappedSchema);

    return prunedSchema;
  };

  const buildSchemas = ({ registry }) => {
    // Here we extract types, plugins & typeDefs from a temporary generated
    // extension since there won't be any addition allowed after schemas generation
    const { types, plugins, typeDefs = [] } = extensionService.generate({ typeRegistry: registry });

    // Create a new Nexus schema (shadow CRUD) & add it to the schemas collection
    const nexusSchema = makeSchema({
      types: [
        // Add the auto-generated Nexus types (shadow CRUD)
        registry.definitions,
        // Add every Nexus type registered using the extension service
        types,
      ],

      plugins: [
        // Add every plugin registered using the extension service
        ...plugins,
      ],
    });

    // Build schemas based on SDL type definitions (defined in the extension)
    const sdlSchemas = typeDefs.map(sdl => makeExecutableSchema({ typeDefs: sdl }));

    return [nexusSchema, ...sdlSchemas];
  };

  const shadowCRUD = () => {
    const extensionService = getGraphQLService('extension');

    // Get every content type & component defined in Strapi
    const contentTypes = [
      ...Object.values(strapi.components),
      ...Object.values(strapi.contentTypes),
    ];

    // Disable Shadow CRUD for admin content types
    contentTypes
      .map(prop('uid'))
      .filter(startsWith('admin::'))
      .forEach(uid => extensionService.shadowCRUD(uid).disable());

    const contentTypesWithShadowCRUD = contentTypes.filter(ct =>
      extensionService.shadowCRUD(ct.uid).isEnabled()
    );

    // Generate and register definitions for every content type
    registerAPITypes(contentTypesWithShadowCRUD);

    // Generate and register polymorphic types' definitions
    registerMorphTypes(contentTypesWithShadowCRUD);
  };

  /**
   * Register needed GraphQL types for every content type
   * @param {object[]} contentTypes
   */
  const registerAPITypes = contentTypes => {
    for (const contentType of contentTypes) {
      const { kind, modelType } = contentType;

      const registerOptions = { registry, strapi, builders };

      // Generate various types associated to the content type
      // (enums, dynamic-zones, filters, inputs...)
      registerEnumsDefinition(contentType, registerOptions);
      registerDynamicZonesDefinition(contentType, registerOptions);
      registerFiltersDefinition(contentType, registerOptions);
      registerInputsDefinition(contentType, registerOptions);

      // Generate & register component's definition
      if (modelType === 'component') {
        registerComponent(contentType, registerOptions);
      }

      // Generate & register single type's definition
      else if (kind === 'singleType') {
        registerSingleType(contentType, registerOptions);
      }

      // Generate & register collection type's definition
      else if (kind === 'collectionType') {
        registerCollectionType(contentType, registerOptions);
      }
    }
  };

  const registerMorphTypes = contentTypes => {
    // Create & register a union type that includes every type or component registered
    const genericMorphType = builders.buildGenericMorphDefinition();
    registry.register(GENERIC_MORPH_TYPENAME, genericMorphType, { kind: KINDS.morph });

    for (const contentType of contentTypes) {
      registerPolymorphicContentType(contentType, { registry, strapi });
    }
  };

  return { buildSchema };
};
