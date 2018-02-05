'use strict';

module.exports = {
  pre: function () {
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

        const findAction = strapi.models['strapi-configs'].orm === 'mongoose' ? 'findOne' : 'forge';

        const where = {
          key: `${prefix}_${key}`,
          environment
        };

        let data = strapi.models['strapi-configs'].orm === 'mongoose'
          ? await strapi.models['strapi-configs'].findOne(where)
          : await strapi.models['strapi-configs'].forge(where).fetch().then(configs => configs.toJSON());

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

        const where = {
          key: `${prefix}_${key}`,
          environment
        };

        let data = strapi.models['strapi-configs'].orm === 'mongoose'
          ? await strapi.models['strapi-configs'].findOne(where)
          : await strapi.models['strapi-configs'].forge(where).fetch().then(configs => configs.toJSON());

        if (data) {
          data = Object.assign(data, {
            value: JSON.stringify(value) || value.toString(),
            type: (typeof value).toString()
          });

          strapi.models['strapi-configs'].orm === 'mongoose'
            ? await strapi.models['strapi-configs'].update({ _id: data._id }, data, { strict: false })
            : await strapi.models['strapi-configs'].forge({ id: data.id }).save(data, { patch: true });
        } else {
          data = Object.assign(where, {
            value: JSON.stringify(value) || value.toString(),
            type: (typeof value).toString()
          });

          strapi.models['strapi-configs'].orm === 'mongoose'
            ? await strapi.models['strapi-configs'].create(data)
            : await strapi.models['strapi-configs'].forge().save(data);
        }
      };

      resolve();
    });
  },
  post: function () {
    return new Promise(async (resolve, reject) => {
      const Model = this.models['strapi-configs'];

      if (Model.orm !== 'bookshelf') {
        return resolve();
      }

      const hasTable = await this.connections[Model.connection].schema.hasTable(Model.tableName || Model.collectionName);

      if (!hasTable) {
        const quote = Model.client === 'pg' ? '"' : '`';

        console.log(`
⚠️  TABLE \`strapi-configs\` DOESN'T EXIST

CREATE TABLE ${quote}${Model.tableName || Model.collectionName}${quote} (
  id ${Model.client === 'pg' ? 'SERIAL' : 'INT AUTO_INCREMENT'} NOT NULL PRIMARY KEY,
  key text,
  value text,
  environment text,
  type text
);
        `);

        // Stop the server.
        return this.stop();
      }

      resolve();
    });
  }
};
