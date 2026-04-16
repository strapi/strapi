import type { Core, Modules } from '@strapi/types';

import { defineProvider } from './provider';
import { cacheEntryModel } from '../services/caching/cache-entry-model';
import { createCacheManager } from '../services/caching/create-cache-manager';
import { createCacheProviderRegistry } from '../services/caching/create-cache-provider-registry';
import { createDatabaseCacheProvider } from '../services/caching/database-cache-provider';
import {
  createMemoryCacheProvider,
  memoryCacheSync,
} from '../services/caching/memory-cache-provider';

export default defineProvider({
  init(strapi: Core.Strapi) {
    const registry = createCacheProviderRegistry();

    registry.register('memory', () => createMemoryCacheProvider());
    registry.register(
      'database',
      ({ strapi: s }: { strapi: Modules.Cache.CacheProviderStrapiContext }) =>
        createDatabaseCacheProvider(s)
    );

    strapi.get('models').add(cacheEntryModel);
    strapi.add('cacheProviderRegistry', registry);
    strapi.add('memoryCacheSync', memoryCacheSync);
    strapi.add('cacheManager', () =>
      createCacheManager({
        strapi,
        registry,
      })
    );
  },
});
