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

/**
 * One instance per type, shared.
 *
 * Every call site constructs with an empty config and no subclass reads `this.config` —
 * `toDB`/`fromDB` are pure functions of their argument — so the instances are
 * interchangeable. They were being allocated once per scalar column per row, which on a
 * page of entities with relations and components ran into the thousands and showed up as
 * GC pressure rather than as time in this function.
 */
const fieldInstances = new Map<string, Field>();

export const createField = (attribute: Attribute): Field => {
  const { type } = attribute;

  const cached = fieldInstances.get(type);

  if (cached !== undefined) {
    return cached;
  }

  // Own-property check: `type` comes from a schema, and an inherited key such as
  // `constructor` must not resolve to a field class. This is also what lodash's `has`
  // did, minus the path parsing it ran on every column of every row.
  if (!Object.prototype.hasOwnProperty.call(typeToFieldMap, type)) {
    throw new Error(`Undefined field for type ${type}`);
  }

  const field = new typeToFieldMap[type]({});
  fieldInstances.set(type, field);

  return field;
};
