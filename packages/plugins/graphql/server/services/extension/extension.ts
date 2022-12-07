import { Strapi } from '@strapi/strapi';
import { merge } from 'lodash/fp';
import { TypeRegistry } from '../../types/common';
import { StrapiCTX } from '../../types/strapi-ctx';

import { builder } from '../builders/pothosBuilder';
import createShadowCRUDManager from './shadow-crud-manager';

interface StrapiGraphQLExtensionConfiguration {
  typeDefs: string[];
  resolvers: any;
  resolversConfig: any;
  // plugins: NexusPlugin[];
}

type StrapiGraphQLExtensionConfigurationFactory = (args: {
  strapi: Strapi;
  typeRegistry: TypeRegistry;
  builder: any;
}) => StrapiGraphQLExtensionConfiguration;

type ConfigType = StrapiGraphQLExtensionConfiguration | StrapiGraphQLExtensionConfigurationFactory;

const getDefaultState = (): StrapiGraphQLExtensionConfiguration => ({
  // types: [],
  typeDefs: [],
  resolvers: {},
  resolversConfig: {},
  // plugins: [],
});

const createExtension = ({ strapi }: StrapiCTX = {} as any) => {
  const configs: ConfigType[] = [];

  return {
    shadowCRUD: createShadowCRUDManager(),

    use(configuration: ConfigType) {
      configs.push(configuration);

      return this;
    },

    /**
     * Convert the registered configuration into a single extension object & return it
     */
    generate({
      typeRegistry,
    }: {
      typeRegistry: Parameters<StrapiGraphQLExtensionConfigurationFactory>['0']['typeRegistry'];
    }) {
      const resolveConfig = (config: ConfigType) => {
        return typeof config === 'function' ? config({ strapi, builder, typeRegistry }) : config;
      };

      // Evaluate & merge every registered configuration object, then return the result
      return configs.reduce((acc: any, configuration: any) => {
        const {
          typeDefs,
          resolvers,
          resolversConfig,
          // plugins, types
        } = resolveConfig(configuration);

        // Register type definitions
        if (typeof typeDefs === 'string') {
          acc.typeDefs.push(typeDefs);
        }

        // Register nexus types
        // if (Array.isArray(types)) {
        //   acc.types.push(...types);
        // }

        // Register nexus plugins
        // if (Array.isArray(plugins)) {
        //   acc.plugins.push(...plugins);
        // }

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
