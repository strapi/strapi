'use strict';

module.exports = {
  pre: function () {
    return new Promise((resolve, reject) => {
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
            type: 'string'
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

          const findAction = strapi.models['core_store'].orm === 'mongoose' ? 'findOne' : 'forge';

          const where = {
            key: `${prefix}_${key}`,
            environment,
            tag
          };

          const data = strapi.models['core_store'].orm === 'mongoose'
          ? await strapi.models['core_store'].findOne(where)
          : await strapi.models['core_store'].forge(where).fetch().then(config => configs.toJSON());

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
          : await strapi.models['core_store'].forge(where).fetch().then(config => config.toJSON());

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
        }
      }

      resolve();
    });
  },
  post: function () {
    return new Promise(async (resolve, reject) => {
      const Model = this.models['core_store'];

      if (Model.orm !== 'bookshelf') {
        return resolve();
      }

      const hasTable = await this.connections[Model.connection].schema.hasTable(Model.tableName || Model.collectionName);

      if (!hasTable) {
        const quote = Model.client === 'pg' ? '"' : '`';

        console.log(`
⚠️  TABLE \`core_store\` DOESN'T EXIST

CREATE TABLE ${quote}${Model.tableName || Model.collectionName}${quote} (
  id ${Model.client === 'pg' ? 'SERIAL' : 'INT AUTO_INCREMENT'} NOT NULL PRIMARY KEY,
  key text,
  value text,
  environment text,
  type text,
  flag text
);

ALTER TABLE ${quote}${Model.tableName || Model.collectionName}${quote} ADD COLUMN ${quote}parent${quote} integer, ADD FOREIGN KEY (${quote}parent${quote}) REFERENCES ${quote}${Model.tableName || Model.collectionName}${quote}(${quote}id${quote});
        `);

        // Stop the server.
        return this.stop();
      }

      resolve();
    });
  }
};
