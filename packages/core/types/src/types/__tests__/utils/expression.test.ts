import path from 'path';
import { t, AssertTypeSelector } from '@strapi/ts-zen';

import { createTypeSelector } from '../test.utils';

const DEFINITIONS_PATH = path.join('utils', 'expression.d.ts');

let type: AssertTypeSelector<typeof import('../definitions/utils/expression')>;

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
    type('IsStrictEqualGivenStringAndStringLiteral').isBooleanLiteral(false);
    type('IsStrictEqualGivenStringLiteralAndString').isBooleanLiteral(false);
    type('IsStrictEqualGivenNumberAndNumberLiteral').isBooleanLiteral(false);
    type('IsStrictEqualGivenNumberLiteralAndNumber').isBooleanLiteral(false);
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

  test('If', () => {
    type('IfTrue').isBooleanLiteral(true);
    type('IfFalse').isBooleanLiteral(false);
    type('IfBoolean').isBooleanLiteral(false);
    type('IfNumber').isBooleanLiteral(false);
    type('IfString').isBooleanLiteral(false);
    type('IfObject').isBooleanLiteral(false);
    type('IfUnknown').isBooleanLiteral(false);
    type('IfAny').isBooleanLiteral(true);
    type('IfNever').isBooleanLiteral(true);
    type('IfStringLiteral').isBooleanLiteral(false);
    type('IfTuple').isBooleanLiteral(false);
    type('IfArray').isBooleanLiteral(false);
    type('IfStringArray').isBooleanLiteral(false);
    type('IfTupleArray').isBooleanLiteral(false);
    type('IfUnion').isBooleanLiteral(false);
    type('IfIntersection').isBooleanLiteral(true);
    type('IfFunction').isBooleanLiteral(false);
    type('IfClass').isBooleanLiteral(false);
    type('IfVoid').isBooleanLiteral(false);
    type('IfNull').isBooleanLiteral(false);
    type('IfUndefined').isBooleanLiteral(false);
    type('IfWithStringReturnType').isStringLiteral('test');
    type('IfWithNumberReturnType').isNumberLiteral(1);
    type('IfWithBooleanReturnType').isBooleanLiteral(true);
    type('IfWithObjectReturnType').isAnonymousObject({
      properties: { foo: t.numberLiteral(1) },
    });
    type('IfWithTupleReturnType').isTuple([
      t.numberLiteral(1),
      t.numberLiteral(2),
      t.numberLiteral(3),
    ]);
    type('IfWithArrayReturnType').isArray(t.string());
    type('IfWithUnionReturnType').isUnion([t.string(), t.number()]);
    type('IfWithVoidReturnType').isVoid();
    type('IfWithNullReturnType').isNull();
    type('IfWithUndefinedReturnType').isUndefined();
    type('IfWithNeverReturnType').isNever();
    type('IfWithUnknownReturnType').isUnknown();
    type('IfWithAnyReturnType').isAny();
  });

  test('MatchFirst', () => {
    type('MatchFirstReturnsTestSuccessful').isStringLiteral('test-successful');
    type('MatchFirstReturnsDefault').isStringLiteral('default');
    type('MatchFirstReturnsNeverWithEmptyTests').isNever();
    type('MatchFirstReturnsNeverWithNeverDefault').isNever();
  });

  test('MatchAllIntersect', () => {
    type('MatchAllIntersectWithOneTrueCondition').isAnonymousObject({
      properties: {
        test: t.numberLiteral(1),
      },
    });
    type('MatchAllIntersectWithAllFalseConditions').isUnknown();
    type('MatchAllIntersectWithIntersection').isStringLiteral('test');
  });

  test('Test', () => {
    type('TestPasses').isTuple([t.booleanLiteral(true), t.stringLiteral('test')]);
    type('TestFails').isTuple([t.booleanLiteral(false), t.stringLiteral('test')]);
  });

  test('And', () => {
    type('AndTrue').isBooleanLiteral(true);
    type('AndFalse').isBooleanLiteral(false);
  });

  test('Or', () => {
    type('OrTrue').isBooleanLiteral(true);
    type('OrFalse').isBooleanLiteral(false);
    type('OrTrueFalse').isBooleanLiteral(true);
  });
});
