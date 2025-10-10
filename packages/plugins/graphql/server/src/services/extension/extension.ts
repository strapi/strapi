import * as nexus from 'nexus';
import { merge } from 'lodash/fp';
import type { Core } from '@strapi/types';
import type * as Nexus from 'nexus';

import createShadowCRUDManager from './shadow-crud-manager';

export type Configuration = {
  types?: NexusGen[];
  typeDefs?: string;
  resolvers?: object;
  resolversConfig?: object;
  plugins?: Nexus.PluginConfig[];
};

export type ConfigurationFactory = (options: {
  strapi: Core.Strapi;
  nexus: typeof nexus;
  typeRegistry: object;
}) => Configuration;

export type Extension = {
  types: NexusGen[];
  typeDefs: string[];
  resolvers: object;
  resolversConfig: object;
  plugins: Nexus.PluginConfig[];
};

const getDefaultState = (): Extension => ({
  types: [],
  typeDefs: [],
  resolvers: {},
  resolversConfig: {},
  plugins: [],
});

const createExtension = ({ strapi }: { strapi: Core.Strapi }) => {
  const configs: Array<Configuration | ConfigurationFactory> = [];

  return {
    shadowCRUD: createShadowCRUDManager(),

    /**
     * Register a new extension configuration
     */
    use(configuration: Configuration | ConfigurationFactory) {
      configs.push(configuration);

      return this;
    },

    /**
     * Convert the registered configuration into a single extension object & return it
     */
    generate({ typeRegistry }: { typeRegistry: object }) {
      const resolveConfig = (config: Configuration | ConfigurationFactory): Configuration => {
        return typeof config === 'function' ? config({ strapi, nexus, typeRegistry }) : config;
      };

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

export default createExtension;
