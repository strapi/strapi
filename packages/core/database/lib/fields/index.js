'use strict';

const _ = require('lodash/fp');

const Field = require('./field');
const StringField = require('./string');
const JSONField = require('./json');
const BigIntegerField = require('./biginteger');
const NumberField = require('./number');
const DateField = require('./date');
const TimeField = require('./time');
const DatetimeField = require('./datetime');
const TimestampField = require('./timestamp');
const BooleanField = require('./boolean');

const typeToFieldMap = {
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
};

const createField = (attribute) => {
  const { type } = attribute;

  if (_.has(type, typeToFieldMap)) {
    return new typeToFieldMap[type]({});
  }

  throw new Error(`Undefined field for type ${type}`);
};

module.exports = {
  createField,
};
