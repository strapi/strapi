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
  'enumeration',
  'biginteger',
  'float',
  'decimal',
  'json',
  'date',
  'time',
  'datetime',
  'timestamp',
  'uid',
  'email',
  'password',
  'text',
];

const SCALARS_ASSOCIATIONS = {
  uid: 'String',
  email: 'String',
  password: 'String',
  text: 'String',
  boolean: 'Boolean',
  integer: 'Int',
  string: 'String',
  enumeration: 'String',
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
  relationResponseCollection: 'relation-response-collection',
  query: 'query',
  mutation: 'mutation',
  input: 'input',
  filtersInput: 'filters-input',
  scalar: 'scalar',
  morph: 'polymorphic',
  internal: 'internal',
};

const allOperators = [
  'and',
  'or',
  'not',

  'eq',
  'eqi',
  'ne',

  'startsWith',
  'endsWith',

  'contains',
  'notContains',

  'containsi',
  'notContainsi',

  'gt',
  'gte',

  'lt',
  'lte',

  'null',
  'notNull',

  'in',
  'notIn',

  'between',
];

const GRAPHQL_SCALAR_OPERATORS = {
  // ID
  ID: allOperators,
  // Booleans
  Boolean: allOperators,
  // Strings
  String: allOperators,
  // Numbers
  Int: allOperators,
  Long: allOperators,
  Float: allOperators,
  // Dates
  Date: allOperators,
  Time: allOperators,
  DateTime: allOperators,
  // Others
  JSON: allOperators,
};

const ERROR_CODES = {
  emptyDynamicZone: 'dynamiczone.empty',
};

export default () => ({
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
