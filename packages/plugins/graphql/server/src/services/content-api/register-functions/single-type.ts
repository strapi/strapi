import type { Core, Struct } from '@strapi/types';
import type { TypeRegistry } from '../../type-registry';

const registerSingleType = (
  contentType: Struct.SingleTypeSchema,
  {
    registry,
    strapi,
    builders,
  }: {
    registry: TypeRegistry;
    strapi: Core.Strapi;
    builders: any;
  }
) => {
  const { service: getService } = strapi.plugin('graphql');

  const { naming } = getService('utils');
  const { KINDS } = getService('constants');

  const extension = getService('extension');

  const types = {
    base: naming.getTypeName(contentType),
    entity: naming.getEntityName(contentType),
    response: naming.getEntityResponseName(contentType),
    responseCollection: naming.getEntityResponseCollectionName(contentType),
    relationResponseCollection: naming.getRelationResponseCollectionName(contentType),
    queries: naming.getEntityQueriesTypeName(contentType),
    mutations: naming.getEntityMutationsTypeName(contentType),
  };

  const getConfig = (kind: string) => ({ kind, contentType });

  // Single type's definition
  registry.register(types.base, builders.buildTypeDefinition(contentType), getConfig(KINDS.type));

  // Higher level entity definition
  registry.register(
    types.entity,
    builders.buildEntityDefinition(contentType),
    getConfig(KINDS.entity)
  );

  // Responses definition
  registry.register(
    types.response,
    builders.buildResponseDefinition(contentType),
    getConfig(KINDS.entityResponse)
  );

  // Response collection definition
  registry.register(
    types.responseCollection,
    builders.buildResponseCollectionDefinition(contentType),
    getConfig(KINDS.entityResponseCollection)
  );

  registry.register(
    types.relationResponseCollection,
    builders.buildRelationResponseCollectionDefinition(contentType),
    getConfig(KINDS.relationResponseCollection)
  );

  if (extension.shadowCRUD(contentType.uid).areQueriesEnabled()) {
    // Queries
    registry.register(
      types.queries,
      builders.buildSingleTypeQueries(contentType),
      getConfig(KINDS.query)
    );
  }

  if (extension.shadowCRUD(contentType.uid).areMutationsEnabled()) {
    // Mutations
    registry.register(
      types.mutations,
      builders.buildSingleTypeMutations(contentType),
      getConfig(KINDS.mutation)
    );
  }
};

export { registerSingleType };
