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
module.exports = cb => {
  syncSchemas().then(() => cb(), err => cb(err));
};

async function syncSchemas() {
  await syncContentTypesSchemas();
  await syncGroupsSchemas();
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
 * sync groups schemas
 */
async function syncGroupsSchemas() {
  const updateConfiguration = async uid => {
    const conf = configurations.find(conf => conf.uid === uid);
    const model = strapi.groups[uid];
    return service.setConfiguration(uid, await syncConfiguration(conf, model));
  };

  const generateNewConfiguration = async uid => {
    return service.setConfiguration(
      uid,
      await createDefaultConfiguration(strapi.groups[uid])
    );
  };

  const service = strapi.plugins['content-manager'].services.groups;

  const configurations = await storeUtils.findByKey(
    'plugin_content_manager_configuration_groups'
  );

  const realUIDs = Object.keys(strapi.groups);
  const DBUIDs = configurations.map(({ uid }) => uid);
  const groupsToUpdate = _.intersection(realUIDs, DBUIDs);
  const groupsToAdd = _.difference(realUIDs, DBUIDs);
  const groupsToDelete = _.difference(DBUIDs, realUIDs);

  // delette old schemas
  await Promise.all(
    groupsToDelete.map(uid => service.deleteConfiguration(uid))
  );

  // create new schemas
  await Promise.all(groupsToAdd.map(uid => generateNewConfiguration(uid)));

  // update current schemas
  await Promise.all(groupsToUpdate.map(uid => updateConfiguration(uid)));
}
