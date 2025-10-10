import { pruneSchema } from '@graphql-tools/utils';
import { makeSchema } from 'nexus';
import { prop, startsWith } from 'lodash/fp';
import type * as Nexus from 'nexus';
import type { Core, Struct } from '@strapi/types';

import { wrapResolvers } from './wrap-resolvers';
import {
  registerSingleType,
  registerCollectionType,
  registerComponent,
  registerScalars,
  registerInternals,
  registerPolymorphicContentType,
  registerEnumsDefinition,
  registerInputsDefinition,
  registerFiltersDefinition,
  registerDynamicZonesDefinition,
} from './register-functions';
import { TypeRegistry } from '../type-registry';

export default ({ strapi }: { strapi: Core.Strapi }) => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { mergeSchemas, addResolversToSchema } = require('@graphql-tools/schema');

  const { service: getGraphQLService } = strapi.plugin('graphql');
  const { config } = strapi.plugin('graphql');

  const { KINDS, GENERIC_MORPH_TYPENAME } = getGraphQLService('constants');
  const extensionService = getGraphQLService('extension');

  // Type Registry
  let registry: any;
  // Builders Instances
  let builders: any;

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

    // Build a merged schema from both Nexus types & SDL type definitions
    const schema = buildMergedSchema({ registry });

    // Generate the extension configuration for the content API.
    // This extension instance needs to be generated after the Nexus schema's
    // generation, so that configurations created during types definitions
    // can be registered before being used in the wrap resolvers operation
    const extension = extensionService.generate({ typeRegistry: registry });

    // Add the extension's resolvers to the final schema
    const schemaWithResolvers = addResolversToSchema({
      schema,
      resolvers: extension.resolvers,
    });

    // Create a configuration object for the artifacts generation
    const outputs: Nexus.core.SchemaConfig['outputs'] = {
      schema: config('artifacts.schema', false),
      typegen: config('artifacts.typegen', false),
    };

    const currentEnv = strapi.config.get('environment');

    const nexusSchema = makeSchema({
      types: [],
      // Build the schema from the merged GraphQL schema.
      // Since we're passing the schema to the mergeSchema property, it'll transform our SDL type definitions
      // into Nexus type definition, thus allowing them to be handled by  Nexus plugins & other processing
      mergeSchema: { schema: schemaWithResolvers },

      // Apply user-defined plugins
      plugins: extension.plugins,

      // Whether to generate artifacts (GraphQL schema, TS types definitions) or not.
      // By default, we generate artifacts only on development environment
      shouldGenerateArtifacts: config('generateArtifacts', currentEnv === 'development'),

      // Artifacts generation configuration
      outputs,
    });

    // Wrap resolvers if needed (auth, middlewares, policies...) as configured in the extension
    const wrappedNexusSchema = wrapResolvers({ schema: nexusSchema, strapi, extension });

    // Prune schema, remove unused types
    // eg: removes registered subscriptions if they're disabled in the config)
    const prunedNexusSchema = pruneSchema(wrappedNexusSchema);

    return prunedNexusSchema;
  };

  const buildMergedSchema = ({ registry }: { registry: TypeRegistry }) => {
    // Here we extract types, plugins & typeDefs from a temporary generated
    // extension since there won't be any addition allowed after schemas generation
    const { types, typeDefs = [] } = extensionService.generate({ typeRegistry: registry });

    // Nexus schema built with user-defined & shadow CRUD auto generated Nexus types
    const nexusSchema = makeSchema({ types: [registry.definitions, types] });

    // Merge type definitions with the Nexus schema
    return mergeSchemas({
      typeDefs,
      // Give access to the shadowCRUD & nexus based types
      // Note: This is necessary so that types defined in SDL can reference types defined with Nexus
      schemas: [nexusSchema],
    });
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
      .forEach((uid) => extensionService.shadowCRUD(uid).disable());

    const contentTypesWithShadowCRUD = contentTypes.filter((ct) =>
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
  const registerAPITypes = (contentTypes: Struct.Schema[]) => {
    for (const contentType of contentTypes) {
      const { modelType } = contentType;

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
        continue;
      }

      const { kind } = contentType;

      // Generate & register single type's definition
      if (kind === 'singleType') {
        registerSingleType(contentType as Struct.SingleTypeSchema, registerOptions);
      }

      // Generate & register collection type's definition
      else if (kind === 'collectionType') {
        registerCollectionType(contentType as Struct.CollectionTypeSchema, registerOptions);
      }
    }
  };

  const registerMorphTypes = (contentTypes: Struct.Schema[]) => {
    // Create & register a union type that includes every type or component registered
    const genericMorphType = builders.buildGenericMorphDefinition();
    registry.register(GENERIC_MORPH_TYPENAME, genericMorphType, { kind: KINDS.morph });

    for (const contentType of contentTypes) {
      registerPolymorphicContentType(contentType, { registry, strapi });
    }
  };

  return { buildSchema };
};
