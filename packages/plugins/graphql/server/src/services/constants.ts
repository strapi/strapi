const PAGINATION_TYPE_NAME = 'Pagination';
const DELETE_MUTATION_RESPONSE_TYPE_NAME = 'DeleteMutationResponse';
const PUBLICATION_STATUS_TYPE_NAME = 'PublicationStatus';
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
] as const;

const STRAPI_SCALARS = [
  'boolean',
  'integer',
  'string',
  'richtext',
  'blocks',
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
] as const;

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
  blocks: 'JSON',
  biginteger: 'Long',
  float: 'Float',
  decimal: 'Float',
  json: 'JSON',
  date: 'Date',
  time: 'Time',
  datetime: 'DateTime',
  timestamp: 'DateTime',
} as const;

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
} as const;

const allOperators = [
  'and',
  'or',
  'not',

  'eq',
  'eqi',
  'ne',
  'nei',

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
] as const;

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
} as const;

const ERROR_CODES = {
  emptyDynamicZone: 'dynamiczone.empty',
} as const;

export type Constants = {
  PAGINATION_TYPE_NAME: string;
  RESPONSE_COLLECTION_META_TYPE_NAME: string;
  PUBLICATION_STATE_TYPE_NAME: string;
  GRAPHQL_SCALARS: string[];
  STRAPI_SCALARS: string[];
  GENERIC_MORPH_TYPENAME: string;
  KINDS: typeof KINDS;
  GRAPHQL_SCALAR_OPERATORS: typeof GRAPHQL_SCALAR_OPERATORS;
  SCALARS_ASSOCIATIONS: typeof SCALARS_ASSOCIATIONS;
  ERROR_CODES: typeof ERROR_CODES;
  ERROR_TYPE_NAME: string;
};

export default () => ({
  PAGINATION_TYPE_NAME,
  RESPONSE_COLLECTION_META_TYPE_NAME,
  DELETE_MUTATION_RESPONSE_TYPE_NAME,
  PUBLICATION_STATUS_TYPE_NAME,
  GRAPHQL_SCALARS,
  STRAPI_SCALARS,
  GENERIC_MORPH_TYPENAME,
  KINDS,
  GRAPHQL_SCALAR_OPERATORS,
  SCALARS_ASSOCIATIONS,
  ERROR_CODES,
  ERROR_TYPE_NAME,
});
