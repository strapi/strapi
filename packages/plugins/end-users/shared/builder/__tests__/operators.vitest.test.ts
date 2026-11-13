import { describe, expect, it } from 'vitest';

import { NEGATING_OPERATORS, operatorsFor, takesList, takesNoValue } from '../operators';
import type { FilterableType } from '../operators';

const TEXT = [
  '$eq',
  '$ne',
  '$contains',
  '$notContains',
  '$containsi',
  '$notContainsi',
  '$startsWith',
  '$endsWith',
  '$in',
  '$notIn',
  '$null',
  '$notNull',
];
const ORDERED = ['$eq', '$ne', '$lt', '$lte', '$gt', '$gte', '$in', '$notIn', '$null', '$notNull'];

// Version 1's lists (server/src/utils/builder-condition.ts, operatorsOf), pinned literally
const V1: Record<FilterableType, string[]> = {
  string: TEXT,
  text: TEXT,
  richtext: TEXT,
  email: TEXT,
  uid: TEXT,
  enumeration: ['$eq', '$ne', '$in', '$notIn', '$null', '$notNull'],
  date: ORDERED,
  datetime: ORDERED,
  time: ORDERED,
  biginteger: ORDERED,
  integer: ORDERED,
  float: ORDERED,
  decimal: ORDERED,
  boolean: ['$eq', '$ne', '$null', '$notNull'],
};

describe('operators', () => {
  it.each(Object.entries(V1))('offers version 1 list for %s', (type, expected) => {
    expect(operatorsFor(type as FilterableType)).toEqual(expected);
  });

  it('names the negating operators', () => {
    expect(NEGATING_OPERATORS).toEqual(['$ne', '$notIn', '$notContains', '$notContainsi']);
  });

  it('knows which operators take no value or a list', () => {
    expect(['$null', '$notNull', '$eq'].map(takesNoValue)).toEqual([true, true, false]);
    expect(['$in', '$notIn', '$eq'].map(takesList)).toEqual([true, true, false]);
  });
});
