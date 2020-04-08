'use strict';

const _ = require('lodash');

const keys = {
  CONFIGURATION: 'configuration',
};

const getStore = () => {
  return strapi.store({
    environment: '',
    type: 'plugin',
    name: 'content_manager',
  });
};

/** Model configuration */
const EMPTY_CONFIG = {
  settings: {},
  metadatas: {},
  layouts: {},
};

const configurationKey = key => `${keys.CONFIGURATION}_${key}`;

const getModelConfiguration = async key => {
  const config = await getStore().get({ key: configurationKey(key) });
  return _.merge({}, EMPTY_CONFIG, config);
};

const setModelConfiguration = async (key, value) => {
  const storedConfig = (await getStore().get({ key: configurationKey(key) })) || {};
  const currentConfig = { ...storedConfig };
  Object.keys(value).forEach(key => {
    if (value[key] !== null && value[key] !== undefined) {
      _.set(currentConfig, key, value[key]);
    }
  });

  if (!_.isEqual(currentConfig, storedConfig)) {
    return getStore().set({
      key: configurationKey(key),
      value: currentConfig,
    });
  }
};

const deleteKey = key => {
  return strapi.query('core_store').delete({ key: `plugin_content_manager_configuration_${key}` });
};

function findByKeyQuery({ model }, key) {
  if (model.orm === 'mongoose') {
    return model
      .find({
        key: { $regex: `${key}.*` },
      })
      .then(results => results.map(({ value }) => JSON.parse(value)));
  }

  return model
    .query(qb => {
      qb.where('key', 'like', `${key}%`);
    })
    .fetchAll()
    .then(config => config && config.toJSON())
    .then(results => results.map(({ value }) => JSON.parse(value)));
}

const findByKey = key => strapi.query('core_store').custom(findByKeyQuery)(key);
const moveKey = (oldKey, newKey) => {
  return strapi.query('core_store').update(
    {
      key: `plugin_content_manager_configuration_${oldKey}`,
    },
    {
      key: `plugin_content_manager_configuration_${newKey}`,
    }
  );
};

const getAllConfigurations = () => findByKey('plugin_content_manager_configuration');

module.exports = {
  getAllConfigurations,
  findByKey,
  getModelConfiguration,
  setModelConfiguration,

  deleteKey,
  moveKey,
  keys,
};
