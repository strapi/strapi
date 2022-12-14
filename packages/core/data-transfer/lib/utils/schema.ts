import type { Schema } from '@strapi/strapi';
import { mapValues, pick } from 'lodash/fp';

const schemaSelectedKeys = [
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

export const mapSchemasValues = (schemas: Record<string, Schema>) => {
  return mapValues(pick(schemaSelectedKeys), schemas);
};
