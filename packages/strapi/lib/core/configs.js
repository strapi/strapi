'use strict';

module.exports = function() {
  return new Promise((resolve, reject) => {
    this.models['strapi-configs'] = {
      connection: 'default',
      info: {
        name: 'strapi-configs',
        description: ''
      },
      attributes: {
        key: {
          type: 'string'
        },
        value: {
          type: 'string'
        },
        type: {
          type: 'string'
        },
        environment: {
          type: 'string'
        }
      },
      globalId: 'StrapiConfigs',
      collectionName: 'strapi-configs'
    };

    this.config.get = async (key, environment = strapi.config.environment, type = 'core', name = '') => {
      const prefix = `${type}${name ? `_${name}` : ''}`;

      const data = await strapi.models['strapi-configs'].findOne({
        key: `${prefix}_${key}`,
        environment
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

    this.config.set = async (key, value, environment = strapi.config.environment, type, name) => {
      const prefix = `${type}${name ? `_${name}` : ''}`;

      await strapi.models['strapi-configs'].create({
        key: `${prefix}_${key}`,
        value: JSON.stringify(value) || value.toString(),
        environment,
        type: (typeof value).toString()
      });
    };

    resolve();
  });
};
