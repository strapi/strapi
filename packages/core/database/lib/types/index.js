'use strict';

const SCALAR_TYPES = [
  'increments',
  'password',
  'email',
  'string',
  'uid',
  'richtext',
  'text',
  'json',
  'enumeration',
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

const STRING_TYPES = ['string', 'text', 'uid', 'email', 'enumeration', 'richtext'];
const NUMBER_TYPES = ['biginteger', 'integer', 'decimal', 'float'];

module.exports = {
  isString: type => STRING_TYPES.includes(type),
  isNumber: type => NUMBER_TYPES.includes(type),
  isScalar: type => SCALAR_TYPES.includes(type),
  isComponent: type => type === 'component',
  isDynamicZone: type => type === 'dynamiczone',
  isRelation: type => type === 'relation',
};
