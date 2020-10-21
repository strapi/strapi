'use strict';

const _ = require('lodash');
const {
  contentTypes: { hasDraftAndPublish },
} = require('strapi-utils');
const storeUtils = require('../../services/utils/store');
const {
  createDefaultConfiguration,
  syncConfiguration,
} = require('../../services/utils/configuration');

const contentTypeConfigurationService = require('../../services/content-types');
const componentService = require('../../services/Components');

const updateContentTypes = async configurations => {
  const updateConfiguration = async uid => {
    const conf = configurations.find(conf => conf.uid === uid);

    return contentTypeConfigurationService.setConfiguration(
      uid,
      await syncConfiguration(conf, strapi.contentTypes[uid])
    );
  };

  const generateNewConfiguration = async uid => {
    return contentTypeConfigurationService.setConfiguration(
      uid,
      await createDefaultConfiguration(strapi.contentTypes[uid])
    );
  };

  const currentUIDS = Object.keys(strapi.contentTypes);
  const DBUIDs = configurations.map(({ uid }) => uid);

  const contentTypesToUpdate = _.intersection(currentUIDS, DBUIDs);
  const contentTypesToAdd = _.difference(currentUIDS, DBUIDs);
  const contentTypesToDelete = _.difference(DBUIDs, currentUIDS);

  // delette old schemas
  await Promise.all(
    contentTypesToDelete.map(uid => contentTypeConfigurationService.deleteConfiguration(uid))
  );

  // create new schemas
  await Promise.all(contentTypesToAdd.map(uid => generateNewConfiguration(uid)));

  // update current schemas
  await Promise.all(contentTypesToUpdate.map(uid => updateConfiguration(uid)));
};

const syncContentTypesSchemas = async () => {
  const configurations = await storeUtils.findByKey(
    'plugin_content_manager_configuration_content_types'
  );

  await updateContentTypes(configurations);
};

const syncComponentsSchemas = async () => {
  const updateConfiguration = async uid => {
    const conf = configurations.find(conf => conf.uid === uid);

    return componentService.setConfiguration(
      uid,
      await syncConfiguration(conf, strapi.components[uid])
    );
  };

  const generateNewConfiguration = async uid => {
    return componentService.setConfiguration(
      uid,
      await createDefaultConfiguration(strapi.components[uid])
    );
  };

  const configurations = await storeUtils.findByKey(
    'plugin_content_manager_configuration_components'
  );

  const realUIDs = Object.keys(strapi.components);
  const DBUIDs = configurations.map(({ uid }) => uid);
  const componentsToUpdate = _.intersection(realUIDs, DBUIDs);
  const componentsToAdd = _.difference(realUIDs, DBUIDs);
  const componentsToDelete = _.difference(DBUIDs, realUIDs);

  // delete old schemas
  await Promise.all(componentsToDelete.map(uid => componentService.deleteConfiguration(uid)));

  // create new schemas
  await Promise.all(componentsToAdd.map(uid => generateNewConfiguration(uid)));

  // update current schemas
  await Promise.all(componentsToUpdate.map(uid => updateConfiguration(uid)));
};

const registerPermissions = () => {
  const contentTypesUids = strapi.plugins['content-manager'].services[
    'content-types'
  ].getDisplayedContentTypesUids();

  const hasDraftAndPublishFilter = _.flow(uid => strapi.contentTypes[uid], hasDraftAndPublish);

  const actions = [
    {
      section: 'contentTypes',
      displayName: 'Create',
      uid: 'explorer.create',
      pluginName: 'content-manager',
      subjects: contentTypesUids,
    },
    {
      section: 'contentTypes',
      displayName: 'Read',
      uid: 'explorer.read',
      pluginName: 'content-manager',
      subjects: contentTypesUids,
    },
    {
      section: 'contentTypes',
      displayName: 'Update',
      uid: 'explorer.update',
      pluginName: 'content-manager',
      subjects: contentTypesUids,
    },
    {
      section: 'contentTypes',
      displayName: 'Delete',
      uid: 'explorer.delete',
      pluginName: 'content-manager',
      subjects: contentTypesUids,
      options: {
        fieldsRestriction: false,
      },
    },
    {
      section: 'contentTypes',
      displayName: 'Publish',
      uid: 'explorer.publish',
      pluginName: 'content-manager',
      subjects: contentTypesUids.filter(hasDraftAndPublishFilter),
      options: {
        fieldsRestriction: false,
      },
    },
    {
      section: 'plugins',
      displayName: 'Configure view',
      uid: 'single-types.configure-view',
      subCategory: 'single types',
      pluginName: 'content-manager',
    },
    {
      section: 'plugins',
      displayName: 'Configure view',
      uid: 'collection-types.configure-view',
      subCategory: 'collection types',
      pluginName: 'content-manager',
    },
    {
      section: 'plugins',
      displayName: 'Configure Layout',
      uid: 'components.configure-layout',
      subCategory: 'components',
      pluginName: 'content-manager',
    },
  ];

  const actionProvider = strapi.admin.services.permission.actionProvider;
  actionProvider.register(actions);
};

module.exports = async () => {
  await syncContentTypesSchemas();
  await syncComponentsSchemas();
  registerPermissions();
};
