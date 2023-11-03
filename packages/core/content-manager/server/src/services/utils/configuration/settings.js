'use strict';

const { isEmpty, pick, pipe, propOr, isEqual } = require('lodash/fp');
const { traverse } = require('@strapi/utils');
const qs = require('qs');
const { isSortable, getDefaultMainField, getSortableAttributes } = require('./attributes');

/** General settings */
const DEFAULT_SETTINGS = {
  bulkable: true,
  filterable: true,
  searchable: true,
  pageSize: 10,
};

const settingsFields = [
  'searchable',
  'filterable',
  'bulkable',
  'pageSize',
  'mainField',
  'defaultSortBy',
  'defaultSortOrder',
];

const getModelSettings = pipe([propOr({}, 'config.settings'), pick(settingsFields)]);

async function isValidDefaultSort(schema, value) {
  const parsedValue = qs.parse(value);

  const omitNonSortableAttributes = ({ schema, key }, { remove }) => {
    const sortableAttributes = getSortableAttributes(schema);
    if (!sortableAttributes.includes(key)) {
      remove(key);
    }
  };

  const sanitizedValue = await traverse.traverseQuerySort(
    omitNonSortableAttributes,
    { schema },
    parsedValue
  );

  // If any of the keys has been removed, the sort attribute is not valid
  return isEqual(parsedValue, sanitizedValue);
}

module.exports = {
  isValidDefaultSort,

  async createDefaultSettings(schema) {
    const defaultField = getDefaultMainField(schema);

    return {
      ...DEFAULT_SETTINGS,
      mainField: defaultField,
      defaultSortBy: defaultField,
      defaultSortOrder: 'ASC',
      ...getModelSettings(schema),
    };
  },

  async syncSettings(configuration, schema) {
    if (isEmpty(configuration.settings)) return this.createDefaultSettings(schema);

    const defaultField = getDefaultMainField(schema);

    const { mainField = defaultField, defaultSortBy = defaultField } = configuration.settings || {};

    return {
      ...configuration.settings,
      mainField: isSortable(schema, mainField) ? mainField : defaultField,
      defaultSortBy: (await isValidDefaultSort(schema, defaultSortBy))
        ? defaultSortBy
        : defaultField,
    };
  },
};
