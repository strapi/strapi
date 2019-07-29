'use strict';

const _ = require('lodash');
const { isSortable } = require('./attributes');

/**
 * Retunrs a configuration default settings
 */
async function createDefaultSettings() {
  const generalSettings = await strapi.plugins[
    'content-manager'
  ].services.generalsettings.getGeneralSettings();

  return {
    ...generalSettings,
    mainField: 'id',
    defaultSortBy: 'id',
    defaultSortOrder: 'ASC',
  };
}

/** Synchronisation functions */

async function syncSettings(configuration, schema) {
  if (_.isEmpty(configuration.settings)) return createDefaultSettings(schema);

  const { mainField = 'id', defaultSortBy = 'id' } =
    configuration.settings || {};

  return {
    ...configuration.settings,
    mainField: isSortable(schema, mainField) ? mainField : 'id',
    defaultSortBy: isSortable(schema, defaultSortBy) ? defaultSortBy : 'id',
  };
}

module.exports = {
  createDefaultSettings,
  syncSettings,
};
