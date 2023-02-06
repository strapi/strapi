import type { Schema } from '@strapi/strapi';
import { mapValues, pick } from 'lodash/fp';

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
 * Sanitize a schemas dictionnary by omiting unwanted properties
 * The list of allowed properties can be found here: {@link VALID_SCHEMA_PROPERTIES}
 */
export const mapSchemasValues = (schemas: Record<string, Schema>) => {
  return mapValues(pick(VALID_SCHEMA_PROPERTIES), schemas);
};
