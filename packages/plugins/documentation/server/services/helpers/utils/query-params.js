'use strict';

module.exports = [
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
];
