'use strict';

const { get, has } = require('lodash/fp');
const { createConfig } = require('../domain/config');

module.exports = async (pluginName, pluginConfig, userConfig) => {
  const currentConfig = createConfig(userConfig, pluginConfig.default);

  try {
    await pluginConfig.validator(currentConfig);
  } catch (e) {
    throw new Error(`Error regarding ${pluginName} config: ${e.message}`);
  }

  const provider = path => provider.get(path);

  Object.assign(provider, {
    get(path) {
      return get(path)(currentConfig);
    },
    has(path) {
      return has(path)(currentConfig);
    },
  });

  return provider;
};
