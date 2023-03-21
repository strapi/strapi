'use strict';

const { getPluginsThatNeedDocumentation } = require('./utils/get-plugins-that-need-documentation');

module.exports = ({ strapi }) => {
  const registeredOverrides = [];
  const excludedFromGeneration = [];
  /**
   *
   * @param {string | string[]} api - The name of the api or and array of apis to exclude from generation
   */
  const excludeFromGeneration = (api) => {
    if (Array.isArray(api)) {
      excludedFromGeneration.push(...api);

      return;
    }

    excludedFromGeneration.push(api);
  };
  /**
   * @TODO pluginOrigin should be required in next major release
   * @param {object} doc - The openapi specifcation to override
   * @param {object} options - The options to override the documentation
   * @param {string} options.pluginOrigin - The name of the plugin that is overriding the documentation
   * @param {string[]} options.excludeFromGeneration - The name of the plugin that is overriding the documentation
   */
  const registerOverride = (override, { pluginOrigin, excludeFromGeneration = [] }) => {
    const pluginsThatNeedDocumentation = getPluginsThatNeedDocumentation(
      strapi.config.get('plugin.documentation')
    );
    // Don't apply the override if the plugin is not in the list of plugins that need documentation
    if (pluginOrigin && !pluginsThatNeedDocumentation.includes(pluginOrigin)) return;

    if (excludeFromGeneration.length) {
      strapi
        .plugin('documentation')
        .service('override')
        .excludeFromGeneration(excludeFromGeneration);
    }

    let overrideToRegister = override;
    // Parse yaml if we receive a string
    if (typeof override === 'string') {
      overrideToRegister = require('yaml').parse(overrideToRegister);
    }
    // receive an object we can register it directly
    registeredOverrides.push(overrideToRegister);
  };

  return {
    registeredOverrides,
    registerOverride,
    excludeFromGeneration,
    excludedFromGeneration,
  };
};
