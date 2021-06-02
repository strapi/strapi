'use strict';

const { join } = require('path');
const { validateStrapiServer } = require('./validation');
const createConfigProvider = require('./config-provider');
const createServiceProvider = require('./service-provider');
const createContentTypeProvider = require('./content-type-provider');

const createPlugin = async (strapi, name, path) => {
  const loadPluginServer = require(join(path, 'strapi-server.js'));
  const pluginServer = await loadPluginServer(strapi);
  const cleanPluginServer = await validateStrapiServer(pluginServer);

  const configProvider = await createConfigProvider(name, cleanPluginServer.config);
  const serviceProvider = await createServiceProvider(cleanPluginServer.services);
  const contentTypeProvider = await createContentTypeProvider(name, cleanPluginServer.contentTypes);

  return {
    bootstrap: cleanPluginServer.bootstrap,
    destroy: cleanPluginServer.destroy,
    config: configProvider,
    service: serviceProvider.get,
    contentType: contentTypeProvider.get,
    getAllContentTypes: contentTypeProvider.getAll,
    // routes: cleanPluginServer.routes,
    // controller: (name) => cleanPluginServer.controllers[name],
  };
};

module.exports = createPlugin;
