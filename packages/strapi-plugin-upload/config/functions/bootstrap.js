'use strict';

/**
 * An asynchronous bootstrap function that runs before
 * your application gets started.
 *
 * This gives you an opportunity to set up your data model,
 * run jobs, or perform some special logic.
 */

const path = require('path');
const _ = require('lodash');
const fs = require('fs');

module.exports = async cb => {
  const Model = strapi.plugins.upload.models.file;

  if (Model.orm === 'bookshelf') {
    const hasTable = await strapi.connections[Model.connection].schema.hasTable(Model.tableName || Model.collectionName);

    if (!hasTable) {
      const quote = Model.client === 'pg' ? '"' : '`';

      strapi.log.warn(`
  ⚠️  TABLE \`upload_file\` DOESN'T EXIST
  ⚠️  TABLE \`upload_file_morph\` DOESN'T EXIST

  CREATE TABLE ${quote}${Model.tableName || Model.collectionName}${quote} (
    id ${Model.client === 'pg' ? 'SERIAL' : 'INT AUTO_INCREMENT'} NOT NULL PRIMARY KEY,
    name text,
    hash text,
    ext text,
    mime text,
    size text,
    url text,
    provider text,
    updated_at ${Model.client === 'pg' ? 'timestamp with time zone' : 'timestamp'},
    created_at ${Model.client === 'pg' ? 'timestamp with time zone' : 'timestamp'}
  );

  CREATE TABLE ${quote}upload_file_morph${quote} (
    id ${Model.client === 'pg' ? 'SERIAL' : 'INT AUTO_INCREMENT'} NOT NULL PRIMARY KEY,
    upload_file_id  ${Model.client === 'pg' ? 'integer' : 'int'},
    related_id  ${Model.client === 'pg' ? 'integer' : 'int'},
    related_type text,
    field text
  );

  1️⃣  EXECUTE THE FOLLOWING SQL QUERY

  2️⃣  RESTART YOUR SERVER
      `);

      strapi.stop();
    }
  }

  // set plugin store
  const pluginStore = strapi.store({
    environment: strapi.config.environment,
    type: 'plugin',
    name: 'upload'
  });

  strapi.plugins.upload.config.providers = [];

  const loadProviders = (basePath, cb) => {
    fs.readdir(path.join(basePath, 'node_modules'), async (err, node_modules) => {
      // get all upload provider
      const uploads = _.filter(node_modules, (node_module) => {
        return _.startsWith(node_module, ('strapi-upload'));
      });

      // mount all providers to get configs
      _.forEach(uploads, (node_module) => {
        strapi.plugins.upload.config.providers.push(
          require(path.join(`${basePath}/node_modules/${node_module}`))
        );
      });

      try {
        // if provider config not exit set one by default
        const config = await pluginStore.get({key: 'provider'});

        if (!config) {
          const provider = _.find(strapi.plugins.upload.config.providers, {provider: 'local'});

          const value = _.assign({}, provider, {
            enabled: true,
            // by default limit size to 1 GB
            sizeLimit: 1000000
          });

          await pluginStore.set({key: 'provider', value});
        }
      } catch (err) {
        strapi.log.error(`Can't load ${config.provider} upload provider.`);
        strapi.log.warn(`Please install strapi-upload-${config.provider} --save in ${path.join(strapi.config.appPath, 'plugins', 'upload')} folder.`);
        strapi.stop();
      }

      cb();
    });
  }

  // Load providers from the plugins' node_modules.
  loadProviders(path.join(strapi.config.appPath, 'plugins', 'upload'), () => {
    // Load providers from the root node_modules.
    loadProviders(path.join(strapi.config.appPath), cb);
  });

};
