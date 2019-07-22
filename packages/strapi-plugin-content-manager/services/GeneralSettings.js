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

  setGeneralSettings(data) {
    return storeUtils.setGeneralSettings(data);
  },
};
