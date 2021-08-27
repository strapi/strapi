'use strict';

const _ = require('lodash');
const { toLower } = require('lodash/fp');
const { getConfigUrls } = require('@strapi/utils');

module.exports = function(strapi) {
  // TODO: delete v3 code
  _.forEach(strapi.plugins, plugin => {
    _.forEach(plugin.middlewares, (middleware, middlewareUID) => {
      const middlewareName = toLower(middlewareUID.split('.')[1]);
      strapi.middleware[middlewareName] = middleware;
    });
  });

  // Preset config in alphabetical order.
  strapi.config.middleware.settings = Object.keys(strapi.middleware).reduce((acc, current) => {
    // Try to find the settings in the current environment, then in the main configurations.
    const currentSettings = _.merge(
      _.cloneDeep(_.get(strapi.middleware[current], ['defaults', current], {})),
      strapi.config.get(['middleware', 'settings', current], {})
    );

    acc[current] = !_.isObject(currentSettings) ? {} : currentSettings;

    // Ensure that enabled key exist by forcing to false.
    _.defaults(acc[current], { enabled: false });

    return acc;
  }, {});

  // default settings
  strapi.config.port = strapi.config.get('server.port') || strapi.config.port;
  strapi.config.host = strapi.config.get('server.host') || strapi.config.host;

  const { serverUrl, adminUrl, adminPath } = getConfigUrls(strapi.config.get('server'));

  strapi.config.server = strapi.config.server || {};
  strapi.config.server.url = serverUrl;
  strapi.config.admin.url = adminUrl;
  strapi.config.admin.path = adminPath;

  // check if we should serve admin panel
  const shouldServeAdmin = strapi.config.get(
    'server.admin.serveAdminPanel',
    strapi.config.get('serveAdminPanel')
  );

  if (!shouldServeAdmin) {
    strapi.config.serveAdminPanel = false;
  }
};
