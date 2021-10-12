'use strict';

/**
 * @typedef {import('types').CoreStore} CoreStore
 * @typedef {import('@strapi/database').Database} Database
 */

const coreStoreModel = {
  uid: 'strapi::core-store',
  collectionName: 'strapi_core_store_settings',
  attributes: {
    key: {
      type: 'string',
    },
    value: {
      type: 'text',
    },
    type: {
      type: 'string',
    },
    environment: {
      type: 'string',
    },
    tag: {
      type: 'string',
    },
  },
};

/**
 * @param {{ db: Database }} ctx
 */
const createCoreStore = ({ db }) => {
  /**
   * @template T
   * @template P
   * @param {T} defaultParams
   * @param {P} params
   * @return {T & P}
   */
  const mergeParams = (defaultParams, params) => {
    return {
      ...defaultParams,
      ...params,
    };
  };

  const storeImpl = {
    /**
     * Get value from the core store
     * @param {Partial<CoreStore & { name: string }>} params
     */
    async get(params = {}) {
      const { key, type = 'core', environment, name, tag } = params;

      const prefix = `${type}${name ? `_${name}` : ''}`;

      const where = {
        key: `${prefix}_${key}`,
        environment: environment || null,
        tag: tag || null,
      };

      const data = await db.query('strapi::core-store').findOne({ where });

      if (!data) {
        return null;
      }

      if (
        data.type === 'object' ||
        data.type === 'array' ||
        data.type === 'boolean' ||
        data.type === 'string'
      ) {
        try {
          return JSON.parse(data.value);
        } catch (err) {
          return new Date(data.value);
        }
      } else if (data.type === 'number') {
        return Number(data.value);
      } else {
        return null;
      }
    },

    /**
     * Set value in the core store
     * @param {Partial<CoreStore & { name: string }>} params
     */
    async set(params = {}) {
      const { key, value, type, environment, name, tag } = params;

      const prefix = `${type}${name ? `_${name}` : ''}`;

      const where = {
        key: `${prefix}_${key}`,
        environment: environment || null,
        tag: tag || null,
      };

      const data = await db.query('strapi::core-store').findOne({ where });

      if (data) {
        return db.query('strapi::core-store').update({
          where: { id: data.id },
          data: {
            value: JSON.stringify(value) || `${value}`,
            type: typeof value,
          },
        });
      }

      return db.query('strapi::core-store').create({
        data: {
          ...where,
          value: JSON.stringify(value) || `${value}`,
          type: typeof value,
        },
      });
    },

    /**
     * Deletes a value from the core store
     * @param {Partial<CoreStore & { name: string }>} params
     */
    async delete(params = {}) {
      const { key, environment, type, name, tag } = params;

      const prefix = `${type}${name ? `_${name}` : ''}`;

      const where = {
        key: `${prefix}_${key}`,
        environment: environment || null,
        tag: tag || null,
      };

      return db.query('strapi::core-store').delete({ where });
    },
  };

  const store = function(defaultParams = {}) {
    return {
      /**
       * @param {Partial<CoreStore & { name: string }>} params
       */
      get: params => storeImpl.get(mergeParams(defaultParams, params)),

      /**
       * @param {Partial<CoreStore & { name: string }>} params
       */
      set: params => storeImpl.set(mergeParams(defaultParams, params)),

      /**
       * @param {Partial<CoreStore & { name: string }>} params
       */
      delete: params => storeImpl.delete(mergeParams(defaultParams, params)),
    };
  };

  store.get = storeImpl.get;
  store.set = storeImpl.set;
  store.delete = storeImpl.delete;

  return store;
};

module.exports = {
  coreStoreModel,
  createCoreStore,
};
