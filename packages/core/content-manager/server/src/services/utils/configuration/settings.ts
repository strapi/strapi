import { isEmpty, pick, pipe, propOr, isEqual } from 'lodash/fp';
import { traverse } from '@strapi/utils';
import qs from 'qs';
import { isSortable, getDefaultMainField, getSortableAttributes } from './attributes';

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

async function isValidDefaultSort(schema: any, value: any) {
  const parsedValue = qs.parse(value);

  const omitNonSortableAttributes = ({ schema, key }: any, { remove }: any) => {
    const sortableAttributes = getSortableAttributes(schema);
    if (!sortableAttributes.includes(key)) {
      remove(key);
    }
  };

  const sanitizedValue = await traverse.traverseQuerySort(
    omitNonSortableAttributes,
    { schema, getModel: strapi.getModel.bind(strapi) },
    parsedValue
  );

  // If any of the keys has been removed, the sort attribute is not valid
  return isEqual(parsedValue, sanitizedValue);
}

const createDefaultSettings = async (schema: any) => {
  const defaultField = getDefaultMainField(schema);

  return {
    ...DEFAULT_SETTINGS,
    mainField: defaultField,
    defaultSortBy: defaultField,
    defaultSortOrder: 'ASC',
    ...getModelSettings(schema),
  };
};

const syncSettings = async (configuration: any, schema: any) => {
  if (isEmpty(configuration.settings)) return createDefaultSettings(schema);

  const defaultField = getDefaultMainField(schema);

  const { mainField = defaultField, defaultSortBy = defaultField } = configuration.settings || {};

  return {
    ...configuration.settings,
    mainField: isSortable(schema, mainField) ? mainField : defaultField,
    defaultSortBy: (await isValidDefaultSort(schema, defaultSortBy)) ? defaultSortBy : defaultField,
  };
};

export { isValidDefaultSort, createDefaultSettings, syncSettings };
