import { Utils } from '../../..';

// IsNever
type IsNeverGivenNever = Utils.Expression.IsNever<never>;
type IsNeverNotGivenNever = Utils.Expression.IsNever<string>;
type IsNeverGivenUnknown = Utils.Expression.IsNever<unknown>;

// IsNotNever
type IsNotNeverGivenNever = Utils.Expression.IsNotNever<never>;
type IsNotNeverGivenUnknown = Utils.Expression.IsNotNever<unknown>;
type IsNotNeverGivenString = Utils.Expression.IsNotNever<string>;
type IsNotNeverGivenStringLiteral = Utils.Expression.IsNotNever<'test'>;

// IsTrue
type IsTrueGivenTrue = Utils.Expression.IsTrue<true>;
type IsTrueGivenFalse = Utils.Expression.IsTrue<false>;
type IsTrueGivenBoolean = Utils.Expression.IsTrue<boolean>;
type IsTrueGivenNonBoolean = Utils.Expression.IsTrue<number>;
type IsTrueGivenNonBooleanLiteral = Utils.Expression.IsTrue<10>;
type IsTrueGivenOne = Utils.Expression.IsTrue<1>;
type IsTrueGivenZero = Utils.Expression.IsTrue<0>;

// IsFalse
type IsFalseGivenTrue = Utils.Expression.IsFalse<true>;
type IsFalseGivenFalse = Utils.Expression.IsFalse<false>;
type IsFalseGivenBoolean = Utils.Expression.IsFalse<boolean>;
type IsFalseGivenNonBoolean = Utils.Expression.IsFalse<number>;
type IsFalseGivenNonBooleanLiteral = Utils.Expression.IsFalse<10>;
type IsFalseGivenOne = Utils.Expression.IsFalse<1>;
type IsFalseGivenZero = Utils.Expression.IsFalse<0>;

// Strict Equal
type IsStrictEqualGivenNever = Utils.Expression.StrictEqual<never, never>;
type IsStrictEqualGivenNeverAndUnknown = Utils.Expression.StrictEqual<never, unknown>;
type IsStrictEqualGivenEqualLiterals = Utils.Expression.StrictEqual<1, 1>;
type IsStrictEqualGivenEqualTypes = Utils.Expression.StrictEqual<boolean, boolean>;
type IsStrictEqualGivenDifferentLiterals = Utils.Expression.StrictEqual<1, 2>;
type IsStrictEqualGivenDifferentTypes = Utils.Expression.StrictEqual<boolean, string>;
type IsStrictEqualGivenStringAndStringLiteral = Utils.Expression.StrictEqual<string, 'hello'>;
type IsStrictEqualGivenStringLiteralAndString = Utils.Expression.StrictEqual<'hello', string>;
type IsStrictEqualGivenNumberAndNumberLiteral = Utils.Expression.StrictEqual<number, 1>;
type IsStrictEqualGivenNumberLiteralAndNumber = Utils.Expression.StrictEqual<1, number>;

// Extends
type StringExtendsString = Utils.Expression.Extends<string, string>;
type StringLiteralExtendsString = Utils.Expression.Extends<'text', string>;
type StringExtendsStringLiteral = Utils.Expression.Extends<string, 'text'>;
type StringExtendsNumber = Utils.Expression.Extends<string, number>;
type StringLiteralExtendsNumber = Utils.Expression.Extends<'text', number>;
type StringExtendsNumberLiteral = Utils.Expression.Extends<string, 10>;
type NumberExtendsNumber = Utils.Expression.Extends<number, number>;
type NumberLiteralExtendsNumber = Utils.Expression.Extends<10, number>;
type NumberExtendsNumberLiteral = Utils.Expression.Extends<number, 10>;
type NumberExtendsString = Utils.Expression.Extends<number, string>;
type NumberLiteralExtendsString = Utils.Expression.Extends<10, string>;
type NumberExtendsStringLiteral = Utils.Expression.Extends<number, 'text'>;
type ObjectExtendsObject = Utils.Expression.Extends<object, object>;
type ObjectLiteralExtendsObject = Utils.Expression.Extends<{ test: 1 }, object>;
type ObjectExtendsObjectLiteral = Utils.Expression.Extends<object, { test: 1 }>;
type ObjectExtendsNumber = Utils.Expression.Extends<object, number>;
type ObjectExtendsAny = Utils.Expression.Extends<object, any>;
type ObjectExtendsUnknown = Utils.Expression.Extends<object, unknown>;
type ObjectExtendsNever = Utils.Expression.Extends<object, never>;
type ArrayExtendsArray = Utils.Expression.Extends<Array<string>, Array<string>>;
type TupleExtendsArray = Utils.Expression.Extends<[string], Array<string>>;
type StringArrayExtendsArray = Utils.Expression.Extends<string[], Array<string>>;

// NotExtends
type StringNotExtendsString = Utils.Expression.DoesNotExtends<string, string>;
type StringLiteralNotExtendsString = Utils.Expression.DoesNotExtends<'text', string>;
type StringNotExtendsStringLiteral = Utils.Expression.DoesNotExtends<string, 'text'>;
type StringNotExtendsNumber = Utils.Expression.DoesNotExtends<string, number>;
type StringLiteralNotExtendsNumber = Utils.Expression.DoesNotExtends<'text', number>;
type StringNotExtendsNumberLiteral = Utils.Expression.DoesNotExtends<string, 10>;
type NumberNotExtendsNumber = Utils.Expression.DoesNotExtends<number, number>;
type NumberLiteralNotExtendsNumber = Utils.Expression.DoesNotExtends<10, number>;
type NumberNotExtendsNumberLiteral = Utils.Expression.DoesNotExtends<number, 10>;
type NumberNotExtendsString = Utils.Expression.DoesNotExtends<number, string>;
type NumberLiteralNotExtendsString = Utils.Expression.DoesNotExtends<10, string>;
type NumberNotExtendsStringLiteral = Utils.Expression.DoesNotExtends<number, 'text'>;
type ObjectNotExtendsObject = Utils.Expression.DoesNotExtends<object, object>;
type ObjectLiteralNotExtendsObject = Utils.Expression.DoesNotExtends<{ test: 1 }, object>;
type ObjectNotExtendsObjectLiteral = Utils.Expression.DoesNotExtends<object, { test: 1 }>;
type ObjectNotExtendsNumber = Utils.Expression.DoesNotExtends<object, number>;
type ObjectNotExtendsAny = Utils.Expression.DoesNotExtends<object, any>;
type ObjectNotExtendsUnknown = Utils.Expression.DoesNotExtends<object, unknown>;
type ObjectNotExtendsNever = Utils.Expression.DoesNotExtends<object, never>;
type ArrayNotExtendsArray = Utils.Expression.DoesNotExtends<Array<string>, Array<string>>;
type TupleNotExtendsArray = Utils.Expression.DoesNotExtends<[string], Array<string>>;
type StringArrayNotExtendsArray = Utils.Expression.DoesNotExtends<string[], Array<string>>;

// If
type IfTrue = Utils.Expression.If<true, true, false>;
type IfFalse = Utils.Expression.If<false, true, false>;
type IfBoolean = Utils.Expression.If<boolean, true, false>;
type IfNumber = Utils.Expression.If<number, true, false>;
type IfString = Utils.Expression.If<string, true, false>;
type IfObject = Utils.Expression.If<object, true, false>;
type IfUnknown = Utils.Expression.If<unknown, true, false>;
type IfAny = Utils.Expression.If<any, true, false>;
type IfNever = Utils.Expression.If<never, true, false>;
type IfStringLiteral = Utils.Expression.If<'test', true, false>;
type IfNumberLiteral = Utils.Expression.If<10, true, false>;
type IfObjectLiteral = Utils.Expression.If<{ test: 1 }, true, false>;
type IfTuple = Utils.Expression.If<[1, 2, 3], true, false>;
type IfArray = Utils.Expression.If<Array<string>, true, false>;
type IfStringArray = Utils.Expression.If<string[], true, false>;
type IfTupleArray = Utils.Expression.If<[string, number], true, false>;
type IfUnion = Utils.Expression.If<string | number, true, false>;
type IfIntersection = Utils.Expression.If<string & number, true, false>;
type IfFunction = Utils.Expression.If<() => void, true, false>;
type IfClass = Utils.Expression.If<new () => void, true, false>;
type IfVoid = Utils.Expression.If<void, true, false>;
type IfNull = Utils.Expression.If<null, true, false>;
type IfUndefined = Utils.Expression.If<undefined, true, false>;
type IfWithStringReturnType = Utils.Expression.If<true, 'test', 'test2'>;
type IfWithNumberReturnType = Utils.Expression.If<true, 1, 2>;
type IfWithBooleanReturnType = Utils.Expression.If<true, true, false>;
type IfWithObjectReturnType = Utils.Expression.If<true, { foo: 1 }, { bar: 'bar' }>;
type IfWithTupleReturnType = Utils.Expression.If<true, [1, 2, 3], [4, 5, 6]>;
// TODO Check this type
type IfWithArrayReturnType = Utils.Expression.If<true, Array<string>, Array<number>>;
type IfWithUnionReturnType = Utils.Expression.If<true, string | number, string & number>;
type IfWithVoidReturnType = Utils.Expression.If<true, void, number>;
type IfWithNullReturnType = Utils.Expression.If<true, null, number>;
type IfWithUndefinedReturnType = Utils.Expression.If<true, undefined, number>;
type IfWithNeverReturnType = Utils.Expression.If<true, never, number>;
type IfWithUnknownReturnType = Utils.Expression.If<true, unknown, number>;
type IfWithAnyReturnType = Utils.Expression.If<true, any, number>;

// MatchFirst
type MatchFirstReturnsTestSuccessful = Utils.Expression.MatchFirst<
  [[Utils.Expression.IsTrue<Utils.Expression.True>, 'test-successful']],
  'fail'
>;
type MatchFirstReturnsDefault = Utils.Expression.MatchFirst<
  [[Utils.Expression.IsTrue<Utils.Expression.False>, 'test-successful']],
  'default'
>;
type MatchFirstReturnsNeverWithEmptyTests = Utils.Expression.MatchFirst<[], 'default'>;
type MatchFirstReturnsNeverWithNeverDefault = Utils.Expression.MatchFirst<
  [[Utils.Expression.IsTrue<Utils.Expression.False>, 'test-successful']],
  never
>;

// MatchAllIntersect
type MatchAllIntersectWithOneTrueCondition = Utils.Expression.MatchAllIntersect<
  [
    [Utils.Expression.IsTrue<Utils.Expression.True>, { test: 1 }],
    [Utils.Expression.IsTrue<Utils.Expression.False>, { test: 2 }]
  ]
>;
type MatchAllIntersectWithAllFalseConditions = Utils.Expression.MatchAllIntersect<
  [
    [Utils.Expression.IsTrue<Utils.Expression.False>, { test: 1 }],
    [Utils.Expression.IsTrue<Utils.Expression.False>, { test: 2 }]
  ]
>;

type MatchAllIntersectWithIntersection = Utils.Expression.MatchAllIntersect<
  [
    [Utils.Expression.Extends<'test', string>, 'test'],
    [Utils.Expression.Extends<'test', string>, 'test']
  ]
>;

// Test
type TestPasses = Utils.Expression.Test<Utils.Expression.IsTrue<Utils.Expression.True>, 'test'>;
type TestFails = Utils.Expression.Test<Utils.Expression.IsTrue<Utils.Expression.False>, 'test'>;

// And
type AndTrue = Utils.Expression.And<
  Utils.Expression.IsTrue<Utils.Expression.True>,
  Utils.Expression.IsTrue<Utils.Expression.True>
>;
type AndFalse = Utils.Expression.And<
  Utils.Expression.IsTrue<Utils.Expression.True>,
  Utils.Expression.IsTrue<Utils.Expression.False>
>;

// Or
type OrTrue = Utils.Expression.Or<
  Utils.Expression.IsTrue<Utils.Expression.True>,
  Utils.Expression.IsTrue<Utils.Expression.True>
>;

type OrFalse = Utils.Expression.Or<
  Utils.Expression.IsTrue<Utils.Expression.False>,
  Utils.Expression.IsTrue<Utils.Expression.False>
>;

type OrTrueFalse = Utils.Expression.Or<
  Utils.Expression.IsTrue<Utils.Expression.True>,
  Utils.Expression.IsTrue<Utils.Expression.False>
>;

export {
  // IsNever
  IsNeverGivenNever,
  IsNeverNotGivenNever,
  IsNeverGivenUnknown,
  // IsNotNever
  IsNotNeverGivenNever,
  IsNotNeverGivenUnknown,
  IsNotNeverGivenString,
  IsNotNeverGivenStringLiteral,
  // Is Strict Equal
  IsStrictEqualGivenNever,
  IsStrictEqualGivenNeverAndUnknown,
  IsStrictEqualGivenEqualLiterals,
  IsStrictEqualGivenEqualTypes,
  IsStrictEqualGivenDifferentLiterals,
  IsStrictEqualGivenDifferentTypes,
  IsStrictEqualGivenStringLiteralAndString,
  IsStrictEqualGivenStringAndStringLiteral,
  IsStrictEqualGivenNumberAndNumberLiteral,
  IsStrictEqualGivenNumberLiteralAndNumber,
  // IsTrue
  IsTrueGivenTrue,
  IsTrueGivenFalse,
  IsTrueGivenBoolean,
  IsTrueGivenNonBoolean,
  IsTrueGivenNonBooleanLiteral,
  IsTrueGivenOne,
  IsTrueGivenZero,
  // IsFalse
  IsFalseGivenTrue,
  IsFalseGivenFalse,
  IsFalseGivenBoolean,
  IsFalseGivenNonBoolean,
  IsFalseGivenNonBooleanLiteral,
  IsFalseGivenOne,
  IsFalseGivenZero,
  // Extends
  StringExtendsString,
  StringLiteralExtendsString,
  StringExtendsStringLiteral,
  StringExtendsNumber,
  StringLiteralExtendsNumber,
  StringExtendsNumberLiteral,
  NumberExtendsNumber,
  NumberLiteralExtendsNumber,
  NumberExtendsNumberLiteral,
  NumberExtendsString,
  NumberLiteralExtendsString,
  NumberExtendsStringLiteral,
  ObjectExtendsObject,
  ObjectLiteralExtendsObject,
  ObjectExtendsObjectLiteral,
  ObjectExtendsNumber,
  ObjectExtendsAny,
  ObjectExtendsUnknown,
  ObjectExtendsNever,
  ArrayExtendsArray,
  TupleExtendsArray,
  StringArrayExtendsArray,
  // NotExtends
  StringNotExtendsString,
  StringLiteralNotExtendsString,
  StringNotExtendsStringLiteral,
  StringNotExtendsNumber,
  StringLiteralNotExtendsNumber,
  StringNotExtendsNumberLiteral,
  NumberNotExtendsNumber,
  NumberLiteralNotExtendsNumber,
  NumberNotExtendsNumberLiteral,
  NumberNotExtendsString,
  NumberLiteralNotExtendsString,
  NumberNotExtendsStringLiteral,
  ObjectNotExtendsObject,
  ObjectLiteralNotExtendsObject,
  ObjectNotExtendsObjectLiteral,
  ObjectNotExtendsNumber,
  ObjectNotExtendsAny,
  ObjectNotExtendsUnknown,
  ObjectNotExtendsNever,
  ArrayNotExtendsArray,
  TupleNotExtendsArray,
  StringArrayNotExtendsArray,
  // If
  IfTrue,
  IfFalse,
  IfBoolean,
  IfNumber,
  IfString,
  IfObject,
  IfUnknown,
  IfAny,
  IfNever,
  IfStringLiteral,
  IfNumberLiteral,
  IfObjectLiteral,
  IfTuple,
  IfArray,
  IfStringArray,
  IfTupleArray,
  IfUnion,
  IfIntersection,
  IfFunction,
  IfClass,
  IfVoid,
  IfNull,
  IfUndefined,
  IfWithStringReturnType,
  IfWithNumberReturnType,
  IfWithBooleanReturnType,
  IfWithObjectReturnType,
  IfWithTupleReturnType,
  IfWithArrayReturnType,
  IfWithUnionReturnType,
  IfWithVoidReturnType,
  IfWithNullReturnType,
  IfWithUndefinedReturnType,
  IfWithNeverReturnType,
  IfWithUnknownReturnType,
  IfWithAnyReturnType,

  // MAtchFirst
  MatchFirstReturnsTestSuccessful,
  MatchFirstReturnsDefault,
  MatchFirstReturnsNeverWithEmptyTests,
  MatchFirstReturnsNeverWithNeverDefault,

  // MatchAllIntersect
  MatchAllIntersectWithOneTrueCondition,
  MatchAllIntersectWithAllFalseConditions,
  MatchAllIntersectWithIntersection,

  // Test
  TestPasses,
  TestFails,

  // And
  AndTrue,
  AndFalse,

  // Or
  OrTrue,
  OrFalse,
  OrTrueFalse,
};
