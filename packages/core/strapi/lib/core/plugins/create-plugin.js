'use strict';

const { join } = require('path');
const { isFunction, defaultsDeep } = require('lodash/fp');
const { env } = require('@strapi/utils');
const { createContentType } = require('@strapi/utils').contentTypes;
const { validateStrapiServer } = require('./validation');

const createPlugin = async (strapi, name, path) => {
  const loadPluginServer = require(join(path, 'strapi-server.js'));
  const userPluginConfig = strapi.config.get(`plugins.${name}`);
  const pluginServer = await loadPluginServer(strapi);

  await validateStrapiServer(pluginServer);

  const defaultConfig = isFunction(pluginServer.config)
    ? await pluginServer.config({ env })
    : pluginServer.config;

  const contentTypes = pluginServer.contentTypes.map(ct =>
    createContentType(ct, { pluginName: name })
  );
  const contentTypesMap = contentTypes.reduce((map, ct) => {
    map[ct.info.singularName] = ct;
    map[ct.info.pluralName] = ct;
  }, {});

  return {
    bootstrap: pluginServer.bootstrap,
    destroy: pluginServer.destroy,
    config: defaultsDeep(defaultConfig, userPluginConfig),
    // routes: pluginServer.routes,
    // controller: (name) => pluginServer.controllers[name],
    service: name => pluginServer.services[name],
    contentType: name => contentTypesMap[name],
    getAllContentTypes: () => Object.values(contentTypes),
  };
};

module.exports = createPlugin;
