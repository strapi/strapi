'use strict';
const _ = require('lodash');

const keys = {
  GENERAL_SETTINGS: 'general_settings',
  CONFIGURATION: 'configuration',
};

const getStore = () => {
  return strapi.store({
    environment: '',
    type: 'plugin',
    name: 'content_manager',
  });
};

/** General settings */

const getGeneralSettings = () =>
  getStore().get({
    key: keys.GENERAL_SETTINGS,
  });

const setGeneralSettings = value =>
  getStore().set({
    key: keys.GENERAL_SETTINGS,
    value,
  });

/** Model configuration */
const EMPTY_CONIG = {
  settings: {},
  metadatas: {},
  layouts: {},
};

const configurationKey = key => `${keys.CONFIGURATION}_${key}`;

const getModelConfiguration = async key => {
  const config = await getStore().get({ key: configurationKey(key) });
  return _.merge(
    {},
    EMPTY_CONIG,
    {
      settings: await getGeneralSettings(),
    },
    config
  );
};

const setModelConfiguration = async (key, value) => {
  const config = (await getStore().get({ key: configurationKey(key) })) || {};

  Object.keys(value).forEach(key => {
    if (key) _.set(config, key, value[key]);
  });

  return getStore().set({
    key: configurationKey(key),
    value: config,
  });
};

module.exports = {
  getGeneralSettings,
  setGeneralSettings,
  getModelConfiguration,
  setModelConfiguration,
};
