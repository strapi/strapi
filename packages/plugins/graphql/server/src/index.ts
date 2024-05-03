import { config } from './config';
import { bootstrap } from './bootstrap';
import { services } from './services';

import type { CacheHint } from 'apollo-server-types';

declare module '@strapi/types' {
  namespace Schema {
    interface PluginOptions {
      graphql?: {
        cacheHint?: {
          find?: CacheHint;
          findOne?: CacheHint;
        };
      };
    }
  }
}

export default {
  config,
  bootstrap,
  services,
};
