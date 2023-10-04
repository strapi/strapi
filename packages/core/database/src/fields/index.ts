import _ from 'lodash/fp';

import Field from './field';
import StringField from './string';
import JSONField from './json';
import BigIntegerField from './biginteger';
import NumberField from './number';
import DateField from './date';
import TimeField from './time';
import DatetimeField from './datetime';
import TimestampField from './timestamp';
import BooleanField from './boolean';

import type { Attribute } from '../types';

const typeToFieldMap: Record<string, typeof Field> = {
  increments: Field,
  password: StringField,
  email: StringField,
  string: StringField,
  uid: StringField,
  richtext: StringField,
  text: StringField,
  enumeration: StringField,
  json: JSONField,
  biginteger: BigIntegerField,
  integer: NumberField,
  float: NumberField,
  decimal: NumberField,
  date: DateField,
  time: TimeField,
  datetime: DatetimeField,
  timestamp: TimestampField,
  boolean: BooleanField,
  blocks: JSONField,
};

export const createField = (attribute: Attribute): Field => {
  const { type } = attribute;

  if (_.has(type, typeToFieldMap)) {
    return new typeToFieldMap[type]({});
  }

  throw new Error(`Undefined field for type ${type}`);
};
