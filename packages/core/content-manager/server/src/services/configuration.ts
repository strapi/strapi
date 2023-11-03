import { intersection, difference } from 'lodash';
import { createDefaultConfiguration, syncConfiguration } from './utils/configuration';

export default ({ isComponent, prefix, storeUtils, getModels }: any) => {
  const uidToStoreKey = (uid: any) => {
    return `${prefix}::${uid}`;
  };

  const getConfiguration = (uid: any) => {
    const storeKey = uidToStoreKey(uid);
    return storeUtils.getModelConfiguration(storeKey);
  };

  const setConfiguration = (uid: any, input: any) => {
    const { settings, metadatas, layouts, options } = input;

    const configuration: any = {
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

  const deleteConfiguration = (uid: any) => {
    const storeKey = uidToStoreKey(uid);
    return storeUtils.deleteKey(storeKey);
  };

  const syncConfigurations = async () => {
    const models = getModels();

    const configurations = await storeUtils.findByKey(
      `plugin_content_manager_configuration_${prefix}`
    );

    const updateConfiguration = async (uid: any) => {
      const conf = configurations.find((conf: any) => conf.uid === uid);

      return setConfiguration(uid, await syncConfiguration(conf, models[uid]));
    };

    const generateNewConfiguration = async (uid: any) => {
      return setConfiguration(uid, await createDefaultConfiguration(models[uid]));
    };

    const currentUIDS = Object.keys(models);
    const DBUIDs = configurations.map(({ uid }: any) => uid);

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
