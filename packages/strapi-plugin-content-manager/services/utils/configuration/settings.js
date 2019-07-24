'use strict';

const _ = require('lodash');
const { hasListableAttribute } = require('./attributes');

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

async function syncSettings(configuration, model) {
  if (_.isEmpty(configuration.settings)) return createDefaultSettings(model);

  const { mainField = 'id', defaultSortBy = 'id' } =
    configuration.settings || {};

  return {
    ...configuration.settings,
    mainField: hasListableAttribute(model, mainField) ? mainField : 'id',
    defaultSortBy: hasListableAttribute(model, defaultSortBy)
      ? defaultSortBy
      : 'id',
  };
}

module.exports = {
  createDefaultSettings,
  syncSettings,
};
