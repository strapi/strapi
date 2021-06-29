'use strict';

const { join } = require('path');
const { defaultsDeep } = require('lodash/fp');
const { env } = require('@strapi/utils');
const createServiceProvider = require('../base-providers/service-provider');
const createContentTypeProvider = require('../base-providers/content-type-provider');
const createPolicyProvider = require('../base-providers/policy-provider');
const { validateStrapiServer, validateContentTypesUnicity } = require('./validation');

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
  contentTypes: [],
};

const registerPluginConfig = async (pluginName, userPluginConfig, pluginConfig, strapi) => {
  const config = defaultsDeep(pluginConfig.default, userPluginConfig);
  try {
    await pluginConfig.validator(pluginConfig);
  } catch (e) {
    throw new Error(`Error regarding ${pluginName} config: ${e.message}`);
  }

  strapi.config.set(`plugins.${pluginName}`, config);
};

const createPlugin = async (strapi, name, pluginDefinition, userPluginConfig) => {
  const loadPluginServer = require(join(pluginDefinition.pathToPlugin, 'strapi-server.js'));
  const pluginServer = await loadPluginServer({ env });
  const cleanPluginServer = defaultsDeep(defaultPlugin, pluginServer);

  try {
    validateStrapiServer(cleanPluginServer);
  } catch (e) {
    throw new Error(
      `
strapi-server.js is invalid for plugin ${name}.
${e.errors.join('\n')}
    `.trim()
    );
  }

  registerPluginConfig(name, userPluginConfig, cleanPluginServer.config, strapi);

  const contentTypeProvider = createContentTypeProvider(cleanPluginServer.contentTypes, { name });
  const policyProvider = createPolicyProvider(cleanPluginServer.policies);
  const serviceProvider = createServiceProvider(cleanPluginServer.services, { strapi });

  validateContentTypesUnicity(contentTypeProvider.getAll());

  return {
    bootstrap: cleanPluginServer.bootstrap,
    register: cleanPluginServer.register,
    destroy: cleanPluginServer.destroy,
    service: (...args) => this.services.get(...args),
    services: serviceProvider,
    contentType: (...args) => this.contentTypes.get(...args),
    contentTypes: contentTypeProvider,
    policy: (...args) => policyProvider.get(...args),
    policies: policyProvider,
  };
};

module.exports = createPlugin;
