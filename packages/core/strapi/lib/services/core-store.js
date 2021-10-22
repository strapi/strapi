'use strict';

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

const createCoreStore = ({ db }) => {
  const mergeParams = (defaultParams, params) => {
    return {
      ...defaultParams,
      ...params,
    };
  };

  const store = function(defaultParams = {}) {
    return {
      get: params => store.get(mergeParams(defaultParams, params)),
      set: params => store.set(mergeParams(defaultParams, params)),
      delete: params => store.delete(mergeParams(defaultParams, params)),
    };
  };

  Object.assign(store, {
    /**
     * Get value from the core store
     * @param {Object} params
     * @returns {*}
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
     * @param {Object} params
     * @returns {*}
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
            value: JSON.stringify(value) || value.toString(),
            type: typeof value,
          },
        });
      }

      return db.query('strapi::core-store').create({
        data: {
          ...where,
          value: JSON.stringify(value) || value.toString(),
          type: typeof value,
        },
      });
    },

    /**
     * Deletes a value from the core store
     * @param {Object} params
     * @returns {*}
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
  });

  return store;
};

module.exports = {
  coreStoreModel,
  createCoreStore,
};
