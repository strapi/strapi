'use strict';

/**
 * GraphQL.js service
 *
 * @description: A set of functions similar to controller's actions to avoid code duplication.
 */

const fs = require('fs');
const path = require('path');

const _ = require('lodash');
const { makeExecutableSchema } = require('graphql-tools');

module.exports = {

  formatGQL: (str) => JSON.stringify(str, null, 2).replace(/['"]+/g, ''),

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

  shadowCRUD: function (models) {
    // Retrieve generic service from the Content Manager plugin.
    const resolvers = strapi.plugins['content-manager'].services['contentmanager'];

    return models.reduce((acc, model) => {
      const params = {
        model
      };

      const query = {};

      // Convert our layer Model to the GraphQL DL.
      const attributes = Object.keys(strapi.models[model].attributes)
        .reduce((acc, attribute) => {
          // Convert our type to the GraphQL type.
          acc[attribute] = this.convertType(strapi.models[model].attributes[attribute].type);

          return acc;
        }, { id: 'String' });

      acc.definition += `type ${strapi.models[model].globalId} ${this.formatGQL(attributes)}\n\n`;

      Object.assign(acc.query, {
        [`${model}s`]: `[${strapi.models[model].globalId}]`,
        [`${model}(id: String!)`]: strapi.models[model].globalId
      });

      // TODO
      // - Apply and execute policies first.
      // - Use pluralize to generate shadow query.
      // - Handle mutations.
      Object.assign(acc.resolver, {
        [`${model}s`]: (_, options) => resolvers.fetchAll(params, {...query, ...options}),
        [`${model}`]: (_, { id }) => resolvers.fetch({ ...params, id }, query)
      });

      return acc;
    }, { definition: ``, query: {}, resolver: {} });
  },

  generateSchema: function () {
    // Exclude core models.
    const models = Object.keys(strapi.models).filter(model => model !== 'core_store');

    // Generate type definition and query/mutation for models.
    const shadowCRUD = true ? this.shadowCRUD(models) : {};

    // Build resolvers.
    const resolvers = {
      Query: shadowCRUD.resolver || {}
    };

    // Concatenate.
    const typeDefs = shadowCRUD.definition + `type Query ${this.formatGQL(shadowCRUD.query)}`;

    // Write schema.
    this.writeGenerateSchema(typeDefs);

    // Build schema.
    const schema = makeExecutableSchema({
      typeDefs,
      resolvers,
    });

    return schema;
  },

  writeGenerateSchema(schema) {
    const generatedFolder = path.resolve(strapi.config.appPath, 'plugins', 'graphql', 'config', 'generated');

    // Create folder if necessary.
    try {
      fs.accessSync(generatedFolder, fs.constants.R_OK | fs.constants.W_OK);
    } catch (err) {
      if (err && err.code === 'ENOENT') {
        fs.mkdirSync(generatedFolder);
      } else {
        console.error(err);
      }
    }

    fs.writeFileSync(path.join(generatedFolder, 'schema.graphql'), schema);
  }

};
