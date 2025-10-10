import _ from 'lodash';

const keys = {
  CONFIGURATION: 'configuration',
};

const getStore = () => strapi.store({ type: 'plugin', name: 'content_manager' });

/** Model configuration */
const EMPTY_CONFIG = {
  settings: {},
  metadatas: {},
  layouts: {},
};

const configurationKey = (key: any) => `${keys.CONFIGURATION}_${key}`;

const getModelConfiguration = async (key: any) => {
  const config = await getStore().get({ key: configurationKey(key) });
  return _.merge({}, EMPTY_CONFIG, config);
};

const setModelConfiguration = async (key: string, value: any) => {
  const storedConfig = (await getStore().get({ key: configurationKey(key) })) || {};
  const currentConfig = { ...storedConfig };

  Object.keys(value).forEach((key) => {
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

const deleteKey = (key: any) => {
  return strapi.db
    .query('strapi::core-store')
    .delete({ where: { key: `plugin_content_manager_configuration_${key}` } });
};

const findByKey = async (key: any) => {
  const results = await strapi.db.query('strapi::core-store').findMany({
    where: {
      key: {
        $startsWith: key,
      },
    },
  });

  return results.map(({ value }) => JSON.parse(value));
};

const getAllConfigurations = () => findByKey('plugin_content_manager_configuration');

export default {
  getAllConfigurations,
  findByKey,
  getModelConfiguration,
  setModelConfiguration,
  deleteKey,
  keys,
};
