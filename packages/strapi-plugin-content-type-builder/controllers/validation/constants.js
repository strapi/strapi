'use strict';

const CONTENT_TYPE = 'CONTENT_TYPE';
const COMPONENT = 'COMPONENT';

const DEFAULT_TYPES = [
  // advanced types
  'media',

  // scalar types
  'string',
  'text',
  'richtext',
  'json',
  'enumeration',
  'password',
  'email',
  'integer',
  'biginteger',
  'float',
  'decimal',
  'date',
  'time',
  'datetime',
  'timestamp',
  'boolean',
];

module.exports = {
  DEFAULT_TYPES,
  modelTypes: {
    CONTENT_TYPE,
    COMPONENT,
  },
};
