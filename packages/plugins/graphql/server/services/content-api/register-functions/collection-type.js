'use strict';

const registerCollectionType = (contentType, { registry, strapi, builders }) => {
  const { service: getService } = strapi.plugin('graphql');

  const { naming } = getService('utils');
  const { KINDS } = getService('constants');

  const extension = getService('extension');

  // Types name (as string)
  const types = {
    base: naming.getTypeName(contentType),
    entity: naming.getEntityName(contentType),
    response: naming.getEntityResponseName(contentType),
    responseCollection: naming.getEntityResponseCollectionName(contentType),
    relationResponseCollection: naming.getRelationResponseCollectionName(contentType),
    queries: naming.getEntityQueriesTypeName(contentType),
    mutations: naming.getEntityMutationsTypeName(contentType),
  };

  const getConfig = kind => ({ kind, contentType });

  // Type definition
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
    // Query extensions
    registry.register(
      types.queries,
      builders.buildCollectionTypeQueries(contentType),
      getConfig(KINDS.query)
    );
  }

  if (extension.shadowCRUD(contentType.uid).areMutationsEnabled()) {
    // Mutation extensions
    registry.register(
      types.mutations,
      builders.buildCollectionTypeMutations(contentType),
      getConfig(KINDS.mutation)
    );
  }
};

module.exports = { registerCollectionType };
