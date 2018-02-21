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
  const pluginStore = strapi.store({
    environment: strapi.config.environment,
    type: 'plugin',
    name: 'upload'
  });

  fs.readdir(path.join(strapi.config.appPath, 'node_modules'), async (err, node_modules) => {
    const uploads = _.filter(node_modules, (node_module) => {
      return _.startsWith(node_module, ('strapi-upload-'));
    });

    strapi.plugins.upload.config.providers = [];

    _.forEach(uploads, (node_module) => {
      strapi.plugins.upload.config.providers.push(
        require(path.join(`${strapi.config.appPath}/node_modules/${node_module}`))
      );
    });

    try {
      const config = await pluginStore.get({key: 'provider'});

      if (!config) {
        const provider = strapi.plugins.upload.config.providers[0];

        const value = _.assign({}, provider, {
          enabled: true
        });

        await pluginStore.set({key: 'provider', value});
      }
    } catch (err) {
      strapi.log.error(`Can't laod ${config.provider} upload provider`);
      strapi.log.warn(`Please install  strapi-upload-${config.provider} --save`);
      strapi.stop();
    }

    cb();
  });
};
