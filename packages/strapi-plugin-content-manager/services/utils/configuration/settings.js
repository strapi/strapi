'use strict';

const _ = require('lodash');
const { isSortable } = require('./attributes');

/** General settings */
const DEFAULT_SETTINGS = {
  bulkable: true,
  filterable: true,
  searchable: true,
  pageSize: 10,
};

const getDefaultMainField = schema =>
  Object.keys(schema.attributes).find(
    key => schema.attributes[key].type === 'string'
  ) || 'id';

/**
 * Retunrs a configuration default settings
 */
async function createDefaultSettings(schema) {
  let defaultField = getDefaultMainField(schema);

  return {
    ...DEFAULT_SETTINGS,
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
