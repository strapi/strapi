import type { Model } from '@strapi/database';

/**
 * Internal KV table for the database cache provider (`strapi::cache-entry`).
 */
export const cacheEntryModel: Model = {
  uid: 'strapi::cache-entry',
  singularName: 'strapi_cache_entries',
  tableName: 'strapi_cache_entries',
  attributes: {
    id: {
      type: 'increments',
    },
    namespace: {
      type: 'string',
    },
    key: {
      type: 'string',
    },
    value: {
      type: 'json',
    },
    expiresAt: {
      type: 'datetime',
    },
    createdAt: {
      type: 'datetime',
    },
    updatedAt: {
      type: 'datetime',
    },
  },
};
