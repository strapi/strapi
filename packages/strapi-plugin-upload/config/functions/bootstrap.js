'use strict';

/**
 * An asynchronous bootstrap function that runs before
 * your application gets started.
 *
 * This gives you an opportunity to set up your data model,
 * run jobs, or perform some special logic.
 */

const path = require('path');
const fs = require('fs');
const _ = require('lodash');

module.exports = async cb => {
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
        // DEPRECATED strapi-upload-* will be remove in next version
        return _.startsWith(node_module, 'strapi-provider-upload') || _.startsWith(node_module, 'strapi-upload');
      });

      node_modules.filter((node_module) => {
        return node_module.startsWith('@');
      })
        .forEach((orga) => {
          const node_modules = fs.readdirSync(path.join(basePath, 'node_modules', orga));

          node_modules.forEach((node_module) => {
            // DEPRECATED strapi-email-* will be remove in next version
            if (_.startsWith(node_module, 'strapi-provider-upload') || _.startsWith(node_module, 'strapi-upload')) {
              uploads.push(`${orga}/${node_module}`);
            }
          });
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
        strapi.log.warn(`Please install strapi-provider-upload-${config.provider} --save in ${path.join(strapi.config.appPath, 'plugins', 'upload')} folder.`);
        strapi.stop();
      }

      cb();
    });
  };

  // Load providers from the plugins' node_modules.
  loadProviders(path.join(strapi.config.appPath, 'plugins', 'upload'), () => {
    // Load providers from the root node_modules.
    loadProviders(path.join(strapi.config.appPath), cb);
  });

};
