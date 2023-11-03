'use strict';

const { intersection, difference } = require('lodash');
const { createDefaultConfiguration, syncConfiguration } = require('./utils/configuration');

module.exports = ({ isComponent, prefix, storeUtils, getModels }) => {
  const uidToStoreKey = (uid) => {
    return `${prefix}::${uid}`;
  };

  const getConfiguration = (uid) => {
    const storeKey = uidToStoreKey(uid);
    return storeUtils.getModelConfiguration(storeKey);
  };

  const setConfiguration = (uid, input) => {
    const { settings, metadatas, layouts, options } = input;

    const configuration = {
      uid,
      settings,
      metadatas,
      layouts,
      ...(options ? { options } : {}),
    };

    if (isComponent) {
      configuration.isComponent = isComponent;
    }

    const storeKey = uidToStoreKey(uid);
    return storeUtils.setModelConfiguration(storeKey, configuration);
  };

  const deleteConfiguration = (uid) => {
    const storeKey = uidToStoreKey(uid);
    return storeUtils.deleteKey(storeKey);
  };

  const syncConfigurations = async () => {
    const models = getModels();

    const configurations = await storeUtils.findByKey(
      `plugin_content_manager_configuration_${prefix}`
    );

    const updateConfiguration = async (uid) => {
      const conf = configurations.find((conf) => conf.uid === uid);

      return setConfiguration(uid, await syncConfiguration(conf, models[uid]));
    };

    const generateNewConfiguration = async (uid) => {
      return setConfiguration(uid, await createDefaultConfiguration(models[uid]));
    };

    const currentUIDS = Object.keys(models);
    const DBUIDs = configurations.map(({ uid }) => uid);

    const contentTypesToUpdate = intersection(currentUIDS, DBUIDs);
    const contentTypesToAdd = difference(currentUIDS, DBUIDs);
    const contentTypesToDelete = difference(DBUIDs, currentUIDS);

    // delete old schemas
    await Promise.all(contentTypesToDelete.map((uid) => deleteConfiguration(uid)));

    // create new schemas
    await Promise.all(contentTypesToAdd.map((uid) => generateNewConfiguration(uid)));

    // update current schemas
    await Promise.all(contentTypesToUpdate.map((uid) => updateConfiguration(uid)));
  };

  return {
    getConfiguration,
    setConfiguration,
    deleteConfiguration,
    syncConfigurations,
  };
};
