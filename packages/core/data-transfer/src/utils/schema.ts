import type { Struct, Utils } from '@strapi/types';
import { mapValues, pick } from 'lodash';

/**
 * List of schema properties that should be kept when sanitizing schemas
 */
const VALID_SCHEMA_PROPERTIES = [
  'collectionName',
  'info',
  'options',
  'pluginOptions',
  'attributes',
  'kind',
  'modelType',
  'modelName',
  'uid',
  'plugin',
  'globalId',
];

/**
 * Sanitize a schemas dictionary by omitting unwanted properties
 * The list of allowed properties can be found here: {@link VALID_SCHEMA_PROPERTIES}
 */
export const mapSchemasValues = (schemas: Utils.String.Dict<Struct.Schema>) => {
  return mapValues(schemas, (schema) =>
    pick(schema, VALID_SCHEMA_PROPERTIES)
  ) as Utils.String.Dict<Struct.Schema>;
};

export const schemasToValidJSON = (schemas: Utils.String.Dict<Struct.Schema>) => {
  return JSON.parse(JSON.stringify(schemas));
};
