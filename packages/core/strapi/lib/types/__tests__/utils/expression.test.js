'use strict';

const path = require('path');

const { createTypeSelector } = require('../test.utils');

const DEFINITIONS_PATH = path.join('utils', 'expression.d.ts');

/**
 * @type {import('ts-zen').AssertTypeSelector<typeof import('../definitions/utils/array')>}
 */
let type;

describe('Utils.Expression', () => {
  beforeAll(() => {
    type = createTypeSelector(DEFINITIONS_PATH);
  });

  test('Is Never', () => {
    type('IsNeverGivenNever').isBooleanLiteral(true);
    type('IsNeverNotGivenNever').isBooleanLiteral(false);
    type('IsNeverGivenUnknown').isBooleanLiteral(false);
  });

  test('Is Not Never', () => {
    type('IsNotNeverGivenNever').isBooleanLiteral(false);
    type('IsNotNeverGivenUnknown').isBooleanLiteral(true);
    type('IsNotNeverGivenString').isBooleanLiteral(true);
    type('IsNotNeverGivenStringLiteral').isBooleanLiteral(true);
  });

  test('Is True', () => {
    type('IsTrueGivenTrue').isBooleanLiteral(true);
    type('IsTrueGivenFalse').isBooleanLiteral(false);
    type('IsTrueGivenBoolean').isBooleanLiteral(false);
    type('IsTrueGivenNonBoolean').isBooleanLiteral(false);
    type('IsTrueGivenNonBooleanLiteral').isBooleanLiteral(false);
    type('IsTrueGivenOne').isBooleanLiteral(false);
    type('IsTrueGivenZero').isBooleanLiteral(false);
  });

  test('Is False', () => {
    type('IsFalseGivenFalse').isBooleanLiteral(true);
    type('IsFalseGivenTrue').isBooleanLiteral(false);
    type('IsFalseGivenBoolean').isBooleanLiteral(false);
    type('IsFalseGivenNonBoolean').isBooleanLiteral(false);
    type('IsFalseGivenNonBooleanLiteral').isBooleanLiteral(false);
    type('IsFalseGivenOne').isBooleanLiteral(false);
    type('IsFalseGivenZero').isBooleanLiteral(false);
  });

  test('Is Strict Equal', () => {
    type('IsStrictEqualGivenNever').isBooleanLiteral(true);
    type('IsStrictEqualGivenNeverAndUnknown').isBooleanLiteral(false);
    type('IsStrictEqualGivenEqualLiterals').isBooleanLiteral(true);
    type('IsStrictEqualGivenEqualTypes').isBooleanLiteral(true);
    type('IsStrictEqualGivenDifferentLiterals').isBooleanLiteral(false);
    type('IsStrictEqualGivenDifferentTypes').isBooleanLiteral(false);
  });

  test('Extends', () => {
    // String
    type('StringExtendsString').isBooleanLiteral(true);
    type('StringLiteralExtendsString').isBooleanLiteral(true);
    type('StringExtendsStringLiteral').isBooleanLiteral(false);
    type('StringExtendsNumber').isBooleanLiteral(false);
    type('StringLiteralExtendsNumber').isBooleanLiteral(false);
    type('StringExtendsNumberLiteral').isBooleanLiteral(false);

    // Number
    type('NumberExtendsNumber').isBooleanLiteral(true);
    type('NumberLiteralExtendsNumber').isBooleanLiteral(true);
    type('NumberExtendsNumberLiteral').isBooleanLiteral(false);
    type('NumberLiteralExtendsString').isBooleanLiteral(false);
    type('NumberExtendsStringLiteral').isBooleanLiteral(false);

    // Object
    type('ObjectExtendsObject').isBooleanLiteral(true);
    type('ObjectLiteralExtendsObject').isBooleanLiteral(true);
    type('ObjectExtendsObjectLiteral').isBooleanLiteral(false);
    type('ObjectExtendsNumber').isBooleanLiteral(false);
    type('ObjectExtendsAny').isBooleanLiteral(true);
    type('ObjectExtendsUnknown').isBooleanLiteral(true);
    type('ObjectExtendsNever').isBooleanLiteral(false);

    // Array
    type('ArrayExtendsArray').isBooleanLiteral(true);
    type('TupleExtendsArray').isBooleanLiteral(true);
    type('StringArrayExtendsArray').isBooleanLiteral(true);
  });

  test('Not Extends', () => {
    type('StringNotExtendsString').isBooleanLiteral(false);
    type('StringLiteralNotExtendsString').isBooleanLiteral(false);
    type('StringNotExtendsStringLiteral').isBooleanLiteral(true);
    type('StringNotExtendsNumber').isBooleanLiteral(true);
    type('StringLiteralNotExtendsNumber').isBooleanLiteral(true);
    type('StringNotExtendsNumberLiteral').isBooleanLiteral(true);
    type('NumberNotExtendsNumber').isBooleanLiteral(false);
    type('NumberLiteralNotExtendsNumber').isBooleanLiteral(false);
    type('NumberNotExtendsNumberLiteral').isBooleanLiteral(true);
    type('NumberNotExtendsString').isBooleanLiteral(true);
    type('NumberLiteralNotExtendsString').isBooleanLiteral(true);
    type('NumberNotExtendsStringLiteral').isBooleanLiteral(true);
    type('ObjectNotExtendsObject').isBooleanLiteral(false);
    type('ObjectLiteralNotExtendsObject').isBooleanLiteral(false);
    type('ObjectNotExtendsObjectLiteral').isBooleanLiteral(true);
    type('ObjectNotExtendsNumber').isBooleanLiteral(true);
    type('ObjectNotExtendsAny').isBooleanLiteral(false);
    type('ObjectNotExtendsUnknown').isBooleanLiteral(false);
    type('ObjectNotExtendsNever').isBooleanLiteral(true);
    type('ArrayNotExtendsArray').isBooleanLiteral(false);
    type('TupleNotExtendsArray').isBooleanLiteral(false);
    type('StringArrayNotExtendsArray').isBooleanLiteral(false);
  });
});
