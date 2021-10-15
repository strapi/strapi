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
  /**
   * @param {string} type
   */
  isString: type => STRING_TYPES.includes(type),
  /**
   * @param {string} type
   */
  isNumber: type => NUMBER_TYPES.includes(type),
  /**
   * @param {string} type
   */
  isScalar: type => SCALAR_TYPES.includes(type),
  /**
   * @param {string} type
   */
  isComponent: type => type === 'component',
  /**
   * @param {string} type
   */
  isDynamicZone: type => type === 'dynamiczone',
  /**
   * @param {string} type
   */
  isRelation: type => type === 'relation',
};
