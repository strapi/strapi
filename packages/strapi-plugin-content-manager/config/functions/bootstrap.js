'use strict';

const _ = require('lodash');
const storeUtils = require('../../services/utils/store');
const {
  createDefaultConfiguration,
  syncConfiguration,
} = require('../../services/utils/configuration');

/**
 * Synchronize content manager schemas
 */
module.exports = () => {
  return syncSchemas();
};

async function syncSchemas() {
  await syncContentTypesSchemas();
  await syncComponentsSchemas();
}

/**
 * Sync content types schemas
 */
async function syncContentTypesSchemas() {
  const configurations = await storeUtils.findByKey(
    'plugin_content_manager_configuration_content_types'
  );

  // update strapi.models
  await updateContentTypesScope(
    _.omit(strapi.models, ['core_store']),
    configurations.filter(({ source }) => !source)
  );

  // update strapi.admin.models
  await updateContentTypesScope(
    strapi.admin.models,
    configurations.filter(({ source }) => source === 'admin'),
    'admin'
  );

  // update strapi.plugins.x.models
  await Promise.all(
    Object.keys(strapi.plugins).map(pluginKey => {
      const plugin = strapi.plugins[pluginKey];

      return updateContentTypesScope(
        plugin.models || {},
        configurations.filter(({ source }) => source === pluginKey),
        pluginKey
      );
    })
  );
}

async function updateContentTypesScope(models, configurations, source) {
  const service = strapi.plugins['content-manager'].services.contenttypes;

  const updateConfiguration = async uid => {
    const conf = configurations.find(conf => conf.uid === uid);
    const model = models[uid];
    return service.setConfiguration(
      { uid, source },
      await syncConfiguration(conf, model)
    );
  };

  const generateNewConfiguration = async uid => {
    return service.setConfiguration(
      { uid, source },
      await createDefaultConfiguration(models[uid])
    );
  };

  const realUIDs = Object.keys(models);
  const DBUIDs = configurations.map(({ uid }) => uid);
  const contentTypesToUpdate = _.intersection(realUIDs, DBUIDs);
  const contentTypesToAdd = _.difference(realUIDs, DBUIDs);
  const contentTypesToDelete = _.difference(DBUIDs, realUIDs);

  // delette old schemas
  await Promise.all(
    contentTypesToDelete.map(uid =>
      service.deleteConfiguration({ uid, source })
    )
  );

  // create new schemas
  await Promise.all(
    contentTypesToAdd.map(uid => generateNewConfiguration(uid))
  );

  // update current schemas
  await Promise.all(contentTypesToUpdate.map(uid => updateConfiguration(uid)));
}

/**
 * sync components schemas
 */
async function syncComponentsSchemas() {
  const updateConfiguration = async uid => {
    const conf = configurations.find(conf => conf.uid === uid);
    const model = strapi.components[uid];
    return service.setConfiguration(uid, await syncConfiguration(conf, model));
  };

  const generateNewConfiguration = async uid => {
    return service.setConfiguration(
      uid,
      await createDefaultConfiguration(strapi.components[uid])
    );
  };

  const service = strapi.plugins['content-manager'].services.components;

  const configurations = await storeUtils.findByKey(
    'plugin_content_manager_configuration_components'
  );

  const realUIDs = Object.keys(strapi.components);
  const DBUIDs = configurations.map(({ uid }) => uid);
  const componentsToUpdate = _.intersection(realUIDs, DBUIDs);
  const componentsToAdd = _.difference(realUIDs, DBUIDs);
  const componentsToDelete = _.difference(DBUIDs, realUIDs);

  // delette old schemas
  await Promise.all(
    componentsToDelete.map(uid => service.deleteConfiguration(uid))
  );

  // create new schemas
  await Promise.all(componentsToAdd.map(uid => generateNewConfiguration(uid)));

  // update current schemas
  await Promise.all(componentsToUpdate.map(uid => updateConfiguration(uid)));
}
