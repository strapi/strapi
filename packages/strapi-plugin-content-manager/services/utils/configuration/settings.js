'use strict';

const _ = require('lodash');
const { isSortable } = require('./attributes');

const getDefaultMainField = schema => {
  if (schema.modelType == 'group') {
    // find first group attribute that is sortable
    return (
      Object.keys(schema.attributes).find(key => isSortable(schema, key)) ||
      'id'
    );
  }

  return 'id';
};

/**
 * Retunrs a configuration default settings
 */
async function createDefaultSettings(schema) {
  const generalSettings = await strapi.plugins[
    'content-manager'
  ].services.generalsettings.getGeneralSettings();

  let defaultField = getDefaultMainField(schema);

  return {
    ...generalSettings,
    mainField: defaultField,
    defaultSortBy: defaultField,
    defaultSortOrder: 'ASC',
    ..._.pick(_.get(schema, ['config', 'settings'], {}), [
      'searchable',
      'filterable',
      'bulkable',
      'pageSize',
      'mainField',
      'defaultSortBy',
      'defaultSortOrder',
    ]),
  };
}

/** Synchronisation functions */

async function syncSettings(configuration, schema) {
  if (_.isEmpty(configuration.settings)) return createDefaultSettings(schema);

  let defaultField = getDefaultMainField(schema);

  const { mainField = defaultField, defaultSortBy = defaultField } =
    configuration.settings || {};

  return {
    ...configuration.settings,
    mainField: isSortable(schema, mainField) ? mainField : defaultField,
    defaultSortBy: isSortable(schema, defaultSortBy)
      ? defaultSortBy
      : defaultField,
  };
}

module.exports = {
  createDefaultSettings,
  syncSettings,
};
