'use strict';

const { merge } = require('lodash/fp');

const { builder } = require('../builders/pothosBuilder');
const createShadowCRUDManager = require('./shadow-crud-manager');

const getDefaultState = () => ({
  types: [],
  typeDefs: [],
  resolvers: {},
  resolversConfig: {},
  plugins: [],
});

const createExtension = ({ strapi } = {}) => {
  const configs = [];

  return {
    shadowCRUD: createShadowCRUDManager({ strapi }),

    use(configuration) {
      configs.push(configuration);

      return this;
    },

    /**
     * Convert the registered configuration into a single extension object & return it
     * @param {object} options
     * @param {object} options.typeRegistry
     * @return {object}
     */
    generate({ typeRegistry }) {
      const resolveConfig = (config) => {
        return typeof config === 'function' ? config({ strapi, builder, typeRegistry }) : config;
      };

      // TODO: ask why the core/upload/server/graphql.js file registers twice?
      configs.shift();

      // Evaluate & merge every registered configuration object, then return the result
      return configs.reduce((acc, configuration) => {
        const { types, typeDefs, resolvers, resolversConfig, plugins } =
          resolveConfig(configuration);

        // Register type definitions
        if (typeof typeDefs === 'string') {
          acc.typeDefs.push(typeDefs);
        }

        // Register nexus types
        if (Array.isArray(types)) {
          acc.types.push(...types);
        }

        // Register nexus plugins
        if (Array.isArray(plugins)) {
          acc.plugins.push(...plugins);
        }

        // Register resolvers
        if (typeof resolvers === 'object') {
          acc.resolvers = merge(acc.resolvers, resolvers);
        }

        // Register resolvers configuration
        if (typeof resolversConfig === 'object') {
          // TODO: smarter merge for auth, middlewares & policies
          acc.resolversConfig = merge(resolversConfig, acc.resolversConfig);
        }

        return acc;
      }, getDefaultState());
    },
  };
};

module.exports = createExtension;
