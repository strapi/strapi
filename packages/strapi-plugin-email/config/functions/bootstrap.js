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
    name: 'email'
  });

  strapi.plugins.email.config.providers = [];

  const loadProviders = (basePath, cb) => {
    fs.readdir(path.join(basePath, 'node_modules'), async (err, node_modules) => {
      // get all email providers
      const emails = _.filter(node_modules, (node_module) => {
        // DEPRECATED strapi-email-* will be remove in next version
        return _.startsWith(node_module, 'strapi-provider-email') || _.startsWith(node_module, 'strapi-email');
      });

      // mount all providers to get configs
      _.forEach(emails, (node_module) => {
        strapi.plugins.email.config.providers.push(
          require(path.join(`${basePath}/node_modules/${node_module}`))
        );
      });

      try {
        // if provider config not exist set one by default
        const config = await pluginStore.get({key: 'provider'});

        if (!config) {
          const provider = _.find(strapi.plugins.email.config.providers, {provider: 'sendmail'});

          const value = _.assign({}, provider, {
            // TODO: set other default settings here
          });

          await pluginStore.set({key: 'provider', value});
        }
      } catch (err) {
        strapi.log.error(`Can't load ${config.provider} email provider.`);
        strapi.log.warn(`Please install strapi-provider-email-${config.provider} --save in ${path.join(strapi.config.appPath, 'plugins', 'email')} folder.`);
        strapi.stop();
      }

      cb();
    });
  };

  // Load providers from the plugins' node_modules.
  loadProviders(path.join(strapi.config.appPath, 'plugins', 'email'), () => {
    // Load providers from the root node_modules.
    loadProviders(path.join(strapi.config.appPath), cb);
  });

};
