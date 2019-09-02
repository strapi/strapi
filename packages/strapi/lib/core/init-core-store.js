'use strict';

module.exports = strapi => {
  strapi.models['core_store'] = coreStoreModel;
  strapi.store = createStore(strapi);
};

const coreStoreModel = {
  connection: 'default',
  info: {
    name: 'core_store',
    description: '',
  },
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
  globalId: 'StrapiConfigs',
  collectionName: 'core_store',
};

const createStore = strapi => {
  return (source = {}) => {
    const get = async (params = {}) => {
      Object.assign(source, params);

      const {
        key,
        environment = strapi.config.environment,
        type = 'core',
        name = '',
        tag = '',
      } = source;

      const prefix = `${type}${name ? `_${name}` : ''}`;

      const where = {
        key: `${prefix}_${key}`,
        environment,
        tag,
      };

      let data;
      if (strapi.models['core_store'].orm === 'mongoose') {
        data = await strapi.models['core_store'].findOne(where);
      } else {
        data = await strapi.models['core_store']
          .forge(where)
          .fetch()
          .then(config => config && config.toJSON());
      }

      if (!data) {
        return null;
      }

      if (
        data.type === 'object' ||
        data.type === 'array' ||
        data.type === 'boolean'
      ) {
        try {
          return JSON.parse(data.value);
        } catch (err) {
          return new Date(data.value);
        }
      } else if (data.type === 'number') {
        return parseFloat(data.value);
      } else {
        return null;
      }
    };

    const set = async (params = {}) => {
      Object.assign(source, params);

      const {
        key,
        value,
        environment = strapi.config.environment,
        type,
        name,
        tag = '',
      } = source;

      const prefix = `${type}${name ? `_${name}` : ''}`;

      const where = {
        key: `${prefix}_${key}`,
        environment,
        tag,
      };

      let data;
      if (strapi.models['core_store'].orm === 'mongoose') {
        data = await strapi.models['core_store'].findOne(where);
      } else {
        data = await strapi.models['core_store']
          .forge(where)
          .fetch()
          .then(config => config && config.toJSON());
      }

      if (data) {
        Object.assign(data, {
          value: JSON.stringify(value) || value.toString(),
          type: (typeof value).toString(),
        });

        if (strapi.models['core_store'].orm === 'mongoose') {
          await strapi.models['core_store'].updateOne({ _id: data._id }, data, {
            strict: false,
          });
        } else {
          await strapi.models['core_store']
            .forge({ id: data.id })
            .save(data, { patch: true });
        }
      } else {
        Object.assign(where, {
          value: JSON.stringify(value) || value.toString(),
          type: (typeof value).toString(),
          tag,
        });

        if (strapi.models['core_store'].orm === 'mongoose') {
          await strapi.models['core_store'].create(where);
        } else {
          await strapi.models['core_store'].forge().save(where);
        }
      }
    };

    return {
      get,
      set,
    };
  };
};
