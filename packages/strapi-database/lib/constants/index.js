'use strict';

// contentTypes and components reserved names
const RESERVED_MODEL_NAMES = ['admin', 'boolean', 'date', 'date-time', 'time', 'upload'];
// attribute reserved names
const RESERVED_ATTRIBUTE_NAMES = [
  '_id',
  'id',
  'length',
  'attributes',
  'relations',
  'changed',
  'created_by',
  'updated_by',
  '_posts', // list found here https://mongoosejs.com/docs/api.html#schema_Schema.reserved
  '_pres',
  'collection',
  'emit',
  'errors',
  'get',
  'init',
  'isModified',
  'isNew',
  'listeners',
  'modelName',
  'on',
  'once',
  'populated',
  'prototype',
  'remove',
  'removeListener',
  'save',
  'schema',
  'toObject',
  'validate',
];

module.exports = {
  RESERVED_MODEL_NAMES,
  RESERVED_ATTRIBUTE_NAMES,
};
