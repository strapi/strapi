'use strict';

const PAGINATION_TYPE_NAME = 'Pagination';
const PUBLICATION_STATE_TYPE_NAME = 'PublicationState';
const ERROR_TYPE_NAME = 'Error';

const RESPONSE_COLLECTION_META_TYPE_NAME = 'ResponseCollectionMeta';

const GRAPHQL_SCALARS = [
  'ID',
  'Boolean',
  'Int',
  'String',
  'Long',
  'Float',
  'JSON',
  'Date',
  'Time',
  'DateTime',
];

const STRAPI_SCALARS = [
  'boolean',
  'integer',
  'string',
  'richtext',
  'biginteger',
  'float',
  'decimal',
  'json',
  'date',
  'time',
  'datetime',
  'timestamp',
  'uid',
];

const SCALARS_ASSOCIATIONS = {
  uid: 'String',
  boolean: 'Boolean',
  integer: 'Int',
  string: 'String',
  richtext: 'String',
  biginteger: 'Long',
  float: 'Float',
  decimal: 'Float',
  json: 'JSON',
  date: 'Date',
  time: 'Time',
  datetime: 'DateTime',
  timestamp: 'DateTime',
};

const GENERIC_MORPH_TYPENAME = 'GenericMorph';

const KINDS = {
  type: 'type',
  component: 'component',
  dynamicZone: 'dynamic-zone',
  enum: 'enum',
  entity: 'entity',
  entityResponse: 'entity-response',
  entityResponseCollection: 'entity-response-collection',
  query: 'query',
  mutation: 'mutation',
  input: 'input',
  filtersInput: 'filters-input',
  scalar: 'scalar',
  morph: 'polymorphic',
  internal: 'internal',
};

const GRAPHQL_SCALAR_OPERATORS = {
  // ID
  ID: ['eq', 'not', 'gt', 'lt'],
  // Booleans
  Boolean: ['eq', 'not'],
  // Strings
  String: ['eq', 'not', 'gt', 'lt', 'contains', 'startsWith', 'endsWith'],
  // Numbers
  Int: ['eq', 'not', 'gt', 'lt'],
  Long: ['eq', 'not', 'gt', 'lt'],
  Float: ['eq', 'not', 'gt', 'lt'],
  // Dates
  Date: ['eq', 'not', 'gt', 'lt'],
  Time: ['eq', 'not', 'gt', 'lt'],
  DateTime: ['eq', 'not', 'gt', 'lt'],
  // Others
  JSON: ['eq', 'not'],
};

const ERROR_CODES = {
  emptyDynamicZone: 'dynamiczone.empty',
};

module.exports = () => ({
  PAGINATION_TYPE_NAME,
  RESPONSE_COLLECTION_META_TYPE_NAME,
  PUBLICATION_STATE_TYPE_NAME,
  GRAPHQL_SCALARS,
  STRAPI_SCALARS,
  GENERIC_MORPH_TYPENAME,
  KINDS,
  GRAPHQL_SCALAR_OPERATORS,
  SCALARS_ASSOCIATIONS,
  ERROR_CODES,
  ERROR_TYPE_NAME,
});
