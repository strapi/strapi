'use strict';

const PAGINATION_TYPE_NAME = 'Pagination';
const PUBLICATION_STATE_TYPE_NAME = 'PublicationState';

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
];

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

module.exports = {
  PAGINATION_TYPE_NAME,
  RESPONSE_COLLECTION_META_TYPE_NAME,
  PUBLICATION_STATE_TYPE_NAME,
  GRAPHQL_SCALARS,
  STRAPI_SCALARS,
  GENERIC_MORPH_TYPENAME,
  KINDS,
};
