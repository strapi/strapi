import type { OpenAPIV3 } from 'openapi-types';

const params: OpenAPIV3.ParameterObject[] = [
  {
    name: 'sort',
    in: 'query',
    description: 'Sort by attributes ascending (asc) or descending (desc)',
    deprecated: false,
    required: false,
    schema: {
      type: 'string',
    },
  },
  {
    name: 'pagination[withCount]',
    in: 'query',
    description: 'Return page/pageSize (default: true)',
    deprecated: false,
    required: false,
    schema: {
      type: 'boolean',
    },
  },
  {
    name: 'pagination[page]',
    in: 'query',
    description: 'Page number (default: 0)',
    deprecated: false,
    required: false,
    schema: {
      type: 'integer',
    },
  },
  {
    name: 'pagination[pageSize]',
    in: 'query',
    description: 'Page size (default: 25)',
    deprecated: false,
    required: false,
    schema: {
      type: 'integer',
    },
  },
  {
    name: 'pagination[start]',
    in: 'query',
    description: 'Offset value (default: 0)',
    deprecated: false,
    required: false,
    schema: {
      type: 'integer',
    },
  },
  {
    name: 'pagination[limit]',
    in: 'query',
    description: 'Number of entities to return (default: 25)',
    deprecated: false,
    required: false,
    schema: {
      type: 'integer',
    },
  },
  {
    name: 'fields',
    in: 'query',
    description: 'Fields to return (ex: title,author)',
    deprecated: false,
    required: false,
    schema: {
      type: 'string',
    },
  },
  {
    name: 'populate',
    in: 'query',
    description: 'Relations to return',
    deprecated: false,
    required: false,
    schema: {
      type: 'string',
    },
  },
  {
    name: 'filters',
    in: 'query',
    description: 'Filters to apply',
    deprecated: false,
    required: false,
    schema: {
      type: 'object',
      additionalProperties: true,
    },
    style: 'deepObject',
  },
  {
    name: 'locale',
    in: 'query',
    description: 'Locale to apply',
    deprecated: false,
    required: false,
    schema: {
      type: 'string',
    },
  },
];

export default params;
