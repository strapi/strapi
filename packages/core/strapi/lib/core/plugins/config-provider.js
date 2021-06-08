'use strict';

const { get, has } = require('lodash/fp');
const { createConfig } = require('../domain/config');

module.exports = async (pluginName, pluginConfig, userConfig) => {
  const currentConfig = createConfig(userConfig, pluginConfig.default);

  await pluginConfig.validator(currentConfig);

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
