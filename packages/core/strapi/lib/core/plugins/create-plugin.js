'use strict';

const { join } = require('path');
const { defaultsDeep } = require('lodash/fp');
const { env } = require('@strapi/utils');
const { validateStrapiServer, validateContentTypesUnicity } = require('./validation');
const createConfigProvider = require('./config-provider');
const createServiceProvider = require('./service-provider');
const createContentTypeProvider = require('./content-type-provider');
const createPolicyProvider = require('./policy-provider');

const defaultPlugin = {
  bootstrap: () => {},
  destroy: () => {},
  register: () => {},
  config: {
    default: {},
    validator: () => {},
  },
  routes: [],
  controllers: {},
  services: () => {},
  policies: {},
  middlewares: {},
  hooks: {},
  contentTypes: [],
};

const createPlugin = async (strapi, name, pluginDefinition) => {
  const loadPluginServer = require(join(pluginDefinition.pathToPlugin, 'strapi-server.js'));
  const pluginServer = await loadPluginServer({ env });
  const cleanPluginServer = defaultsDeep(defaultPlugin, pluginServer);

  validateStrapiServer(cleanPluginServer);

  const configProvider = await createConfigProvider(
    name,
    cleanPluginServer.config,
    pluginDefinition.userConfig
  );
  const contentTypeProvider = await createContentTypeProvider(name, cleanPluginServer.contentTypes);
  const policyProvider = await createPolicyProvider(name, cleanPluginServer.policies);
  const serviceProvider = await createServiceProvider(cleanPluginServer.services, { strapi });

  validateContentTypesUnicity(contentTypeProvider.getAll());

  return {
    bootstrap: cleanPluginServer.bootstrap,
    register: cleanPluginServer.register,
    destroy: cleanPluginServer.destroy,
    config: configProvider,
    service: serviceProvider,
    policy: policyProvider,
    contentType: contentTypeProvider,
  };
};

module.exports = createPlugin;
