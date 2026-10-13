import { intersection, difference } from 'lodash';

import type { Settings, Metadatas, Layouts } from '../../../shared/contracts/content-types';

import { createDefaultConfiguration, syncConfiguration } from './utils/configuration';

export type ConfigurationUpdate = {
  settings: Settings;
  metadatas: Metadatas;
  layouts: Layouts;
  options?: Record<string, unknown>;
};

export default ({
  isComponent,
  prefix,
  storeUtils,
  getModels,
}: {
  isComponent?: boolean;
  prefix: string;
  storeUtils: any;
  getModels: any;
}) => {
  const uidToStoreKey = (uid: string) => {
    return `${prefix}::${uid}`;
  };

  const getConfiguration = (uid: string) => {
    const storeKey = uidToStoreKey(uid);

    return storeUtils.getModelConfiguration(storeKey);
  };

  const setConfiguration = (uid: string, input: ConfigurationUpdate) => {
    const configuration = {
      ...input,
      uid,
      isComponent: isComponent ?? undefined,
    };

    const storeKey = uidToStoreKey(uid);
    return storeUtils.setModelConfiguration(storeKey, configuration);
  };

  const deleteConfiguration = (uid: string) => {
    const storeKey = uidToStoreKey(uid);

    return storeUtils.deleteKey(storeKey);
  };

  const syncConfigurations = async () => {
    const models = getModels();

    const configurations = await storeUtils.findByKey(
      `plugin_content_manager_configuration_${prefix}`
    );

    const updateConfiguration = async (uid: string) => {
      const conf = configurations.find((conf: any) => conf.uid === uid);

      return setConfiguration(uid, await syncConfiguration(conf, models[uid]));
    };

    const generateNewConfiguration = async (uid: string) => {
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
