import type { Attribute, ScalarAttribute, RelationalAttribute } from '../types';

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
  'blocks',
];

const STRING_TYPES = ['string', 'text', 'uid', 'email', 'enumeration', 'richtext'];
const NUMBER_TYPES = ['biginteger', 'integer', 'decimal', 'float'];

export const isString = (type: string) => STRING_TYPES.includes(type);
export const isNumber = (type: string) => NUMBER_TYPES.includes(type);
export const isScalar = (type: string) => SCALAR_TYPES.includes(type);
export const isRelation = (type: string) => type === 'relation';
export const isScalarAttribute = (attribute: Attribute): attribute is ScalarAttribute =>
  isScalar(attribute.type);
export const isRelationalAttribute = (attribute: Attribute): attribute is RelationalAttribute =>
  isRelation(attribute.type);
