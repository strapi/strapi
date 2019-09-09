'use strict';

const storeUtils = require('./utils/store');

const defaultGeneralSettings = {
  searchable: true,
  filterable: true,
  bulkable: true,
  pageSize: 10,
};

module.exports = {
  async getGeneralSettings() {
    const generalSettings = await storeUtils.getGeneralSettings();

    return generalSettings || defaultGeneralSettings;
  },

  async setGeneralSettings(data) {
    await storeUtils.setGeneralSettings(data);

    // overwriite all the other configuration settings
    const groupsService = strapi.plugins['content-manager'].services.groups;
    const contentTypesService =
      strapi.plugins['content-manager'].services.contenttypes;

    const configurations = await storeUtils.getAllConfigurations();

    await Promise.all(
      configurations.map(value => {
        const { uid, source } = value;
        const settings = {
          ...value.settings,
          ...data,
        };

        if (value.isGroup) {
          return groupsService.setConfiguration(value.uid, {
            settings,
          });
        }

        return contentTypesService.setConfiguration(
          { uid, source },
          { settings }
        );
      })
    );
  },
};
