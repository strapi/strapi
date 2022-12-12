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

export const mapSchemasValues = (schemas: any) => mapValues(pick(schemaSelectedKeys), schemas);
