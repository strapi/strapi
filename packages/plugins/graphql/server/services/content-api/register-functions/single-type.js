'use strict';

const registerSingleType = (contentType, { registry, strapi, builders }) => {
  const { service: getService } = strapi.plugin('graphql');

  const { naming } = getService('utils');
  const { KINDS } = getService('constants');

  const types = {
    base: naming.getTypeName(contentType),
    entity: naming.getEntityName(contentType),
    response: naming.getEntityResponseName(contentType),
    responseCollection: naming.getEntityResponseCollectionName(contentType),
    queries: naming.getEntityQueriesTypeName(contentType),
    mutations: naming.getEntityMutationsTypeName(contentType),
  };

  const getConfig = kind => ({ kind, contentType });

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

  // Queries
  registry.register(
    types.queries,
    builders.buildSingleTypeQueries(contentType),
    getConfig(KINDS.query)
  );

  registry.register(
    types.mutations,
    builders.buildSingleTypeMutations(contentType),
    getConfig(KINDS.mutation)
  );
};

module.exports = { registerSingleType };
