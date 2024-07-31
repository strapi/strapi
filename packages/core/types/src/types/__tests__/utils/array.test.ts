import path from 'path';
import { AssertTypeSelector, t } from '@strapi/ts-zen';

import { createTypeSelector } from '../test.utils';

const DEFINITIONS_PATH = path.join('utils', 'array.d.ts');

let type: AssertTypeSelector<typeof import('../definitions/utils/array')>;

describe('Utils.Array', () => {
  beforeAll(() => {
    type = createTypeSelector(DEFINITIONS_PATH);
  });

  test('String Values', () => {
    type('StringValues').isUnion([
      t.stringLiteral('foo'),
      t.stringLiteral('bar'),
      t.stringLiteral('baz'),
    ]);
  });

  test('Mixed Values', () => {
    const expectedResultType = [
      t.anonymousObject({
        properties: {
          foo: t.stringLiteral('bar'),
          baz: t.booleanLiteral(false),
          prop: t.anonymousObject({
            properties: {
              foo: t.stringLiteral('bar'),
              bar: t.stringLiteral('foo'),
            },
          }),
        },
      }),
      t.numberLiteral(1),
      t.stringLiteral('foo'),
      t.booleanLiteral(true),
    ];
    type('MixedValues').isUnion(expectedResultType);
    // The result type should not contain the type 'never'
    type('ContainsNever').isUnion(expectedResultType);
  });

  test('Number Values', () => {
    type('NumberValues').isUnion([t.numberLiteral(1), t.numberLiteral(2), t.numberLiteral(3)]);
  });

  test('Bool Values', () => {
    type('BoolValues').isBoolean();
    type('TrueBoolLiteralValues').isBooleanLiteral(true);
    type('FalseBoolLiteralValues').isBooleanLiteral(false);
  });

  test('Object Values', () => {
    type('ObjectValues').isUnion([
      t.anonymousObject({
        properties: { prop1: t.booleanLiteral(true), prop2: t.booleanLiteral(false) },
      }),
      t.anonymousObject({
        properties: {
          foo: t.stringLiteral('bar'),
          baz: t.booleanLiteral(false),
          prop: t.anonymousObject({
            properties: {
              foo: t.stringLiteral('bar'),
              bar: t.stringLiteral('foo'),
            },
          }),
        },
      }),
    ]);
  });

  test('Is Empty', () => {
    type('IsEmptyWithEmptyTuple').isBooleanLiteral(true);
    type('IsEmptyWithNotEmptyTuple').isBooleanLiteral(false);
  });

  test('Is Not Empty', () => {
    type('IsNotEmptyWithNotEmptyTuple').isBooleanLiteral(true);
    type('IsNotEmptyWithEmptyTuple').isBooleanLiteral(false);
  });
});
