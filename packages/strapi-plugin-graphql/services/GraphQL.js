'use strict';

/**
 * GraphQL.js service
 *
 * @description: A set of functions similar to controller's actions to avoid code duplication.
 */

const { makeExecutableSchema } = require('graphql-tools');

module.exports = {

  convertType: (type) => {
    switch (type) {
      case 'string':
      case 'text':
        return 'String';
      case 'boolean':
        return 'Boolean';
      default:
        return 'String';
    }
  },

  shadowCRUD: (type, source) => {
    // Retrieve generic service from the Content Manager plugin.
    const resolvers = strapi.plugins['content-manager'].services['contentmanager'];

    const params = {
      model: type
    };

    const query = {
      source
    };

    // TODO
    // - Apply and execute policies first.
    // - Use pluralize to generate shadow query.
    // - Handle mutations.

    return {
      [`${type}s`]: (_, options) => resolvers.fetchAll(params, {...query, ...options}),
      [`${type}`]: (_, { id }) => resolvers.fetch({ ...params, id }, query)
    };
  },

  generateSchema: function () {
    // Exclude core models.
    const models = Object.keys(strapi.models).filter(model => model !== 'core_store');

    // Build resolvers.
    const resolvers = {
      Query: models.reduce((acc, current) => {
        return Object.assign(acc, this.shadowCRUD(current));
      }, {})
    };

    // TODO
    // - Expose plugins models.

    // Build types definitions.
    const modelsDefinition = models.reduce((acc, current) => {
      // Convert our layer Model to the GraphQL DL.
      const attributes = Object.keys(strapi.models[current].attributes)
        .reduce((acc, attribute) => {
          // Convert our type to the GraphQL type.
          acc[attribute] = this.convertType(strapi.models[current].attributes[attribute].type);

          return acc;
        }, {});

      const definition = JSON.stringify(attributes, null, 2).replace(/['"]+/g, '');

      return acc += `type ${strapi.models[current].globalId} ${definition}\n\n`;
    }, ``);

    const modelsQueriesDefinition = models.reduce((acc, current) => {
      return Object.assign(acc, {
        [`${current}s`]: [strapi.models[current].globalId],
        [`${current}(id: String!)`]: strapi.models[current].globalId
      });
    }, {});

    const modelsQueriesDefinitionCleaned = JSON.stringify(modelsQueriesDefinition, null, 2).replace(/['"]+/g, '');

    // Build queries.
    const queriesDefinition = `type Query ${modelsQueriesDefinitionCleaned}`;

    // Concatenate.
    const typeDefs = modelsDefinition + queriesDefinition;
    // Build schema.
    const schema = makeExecutableSchema({
      typeDefs,
      resolvers,
    });

    return schema;
  }

};
