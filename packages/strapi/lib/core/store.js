'use strict';

module.exports = function () {
  return new Promise((resolve) => {
    this.models['core_store'] = {
      connection: 'default',
      info: {
        name: 'core_store',
        description: ''
      },
      attributes: {
        key: {
          type: 'string'
        },
        value: {
          type: 'text'
        },
        type: {
          type: 'string'
        },
        environment: {
          type: 'string'
        },
        tag: {
          type: 'string'
        }
      },
      globalId: 'StrapiConfigs',
      collectionName: 'core_store'
    };

    this.store = (source = {}) => {
      const get = async (params = {}) => {
        Object.assign(source, params);

        const {
          key,
          environment = strapi.config.environment,
          type = 'core',
          name = '',
          tag = ''
        } = source;

        const prefix = `${type}${name ? `_${name}` : ''}`;


        const where = {
          key: `${prefix}_${key}`,
          environment,
          tag
        };

        const data = strapi.models['core_store'].orm === 'mongoose'
          ? await strapi.models['core_store'].findOne(where)
          : await strapi.models['core_store'].forge(where).fetch().then(config => {
            if (config) {
              return config.toJSON();
            }
          });

        if (!data) {
          return null;
        }

        if (data.type === 'object' || data.type === 'array' || data.type === 'boolean') {
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
          tag = ''
        } = source;

        const prefix = `${type}${name ? `_${name}` : ''}`;

        const where = {
          key: `${prefix}_${key}`,
          environment,
          tag
        };

        let data = strapi.models['core_store'].orm === 'mongoose'
          ? await strapi.models['core_store'].findOne(where)
          : await strapi.models['core_store'].forge(where).fetch().then(config => {
            if (config) {
              return config.toJSON();
            }
          });

        if (data) {
          Object.assign(data, {
            value: JSON.stringify(value) || value.toString(),
            type: (typeof value).toString()
          });

          strapi.models['core_store'].orm === 'mongoose'
            ? await strapi.models['core_store'].update({ _id: data._id }, data, { strict: false })
            : await strapi.models['core_store'].forge({ id: data.id }).save(data, { patch: true });
        } else {
          Object.assign(where, {
            value: JSON.stringify(value) || value.toString(),
            type: (typeof value).toString(),
            tag

          });

          strapi.models['core_store'].orm === 'mongoose'
            ? await strapi.models['core_store'].create(where)
            : await strapi.models['core_store'].forge().save(where);
        }
      };

      return {
        get,
        set
      };
    };

    resolve();
  });
};
