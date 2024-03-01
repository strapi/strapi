import type { Array, Constants, Guard, Simplify } from './';

export type IsNever<TValue> = StrictEqual<TValue, never>;

export type IsNotNever<TValue> = Not<IsNever<TValue>>;

export type IsTrue<TValue> = [TValue] extends [Constants.True] ? Constants.True : Constants.False;

export type IsNotTrue<TValue> = Not<IsTrue<TValue>>;

export type IsFalse<TValue> = [TValue] extends [Constants.False] ? Constants.True : Constants.False;

export type IsNotFalse<TValue> = Not<IsFalse<TValue>>;

export type StrictEqual<TValue, TMatch> = And<Extends<TValue, TMatch>, Extends<TMatch, TValue>>;

export type NotStrictEqual<TValue, TMatch> = Not<StrictEqual<TValue, TMatch>>;

export type Extends<TLeft, TRight> = [TLeft] extends [TRight] ? Constants.True : Constants.False;

export type DoesNotExtends<TLeft, TRight> = Not<Extends<TLeft, TRight>>;

export type Not<TExpression extends Constants.BooleanValue> = If<
  TExpression,
  Constants.False,
  Constants.True
>;

export type If<TExpression extends Constants.BooleanValue, TOnTrue, TOnFalse = never> = [
  TExpression
] extends [Constants.True]
  ? TOnTrue
  : TOnFalse;

export type MatchFirst<TTests extends Test[], TDefault = never> = TTests extends [
  infer THead extends Test,
  ...infer TTail extends Test[]
]
  ? THead extends Test<infer TExpression, infer TValue>
    ? If<TExpression, TValue, If<Array.IsNotEmpty<TTail>, MatchFirst<TTail, TDefault>, TDefault>>
    : never
  : never;

export type MatchAllIntersect<TTests extends Test[], TDefault = unknown> = TTests extends [
  infer THead extends Test,
  ...infer TTail extends Test[]
]
  ? THead extends Test<infer TExpression, infer TValue>
    ? // Actual test case evaluation
      If<TExpression, TValue, TDefault> &
        // Recursion / End of recursion
        If<Array.IsNotEmpty<TTail>, MatchAllIntersect<TTail, TDefault>, TDefault>
    : TDefault
  : TDefault;

export type Test<
  TExpression extends Constants.BooleanValue = Constants.BooleanValue,
  TValue = unknown
> = [TExpression, TValue];

export type Some<TExpressions extends Constants.BooleanValue[]> = TExpressions extends [
  infer THead extends Constants.BooleanValue,
  ...infer TTail extends Constants.BooleanValue[]
]
  ? If<Array.IsNotEmpty<TTail>, Or<THead, Some<TTail>>, Or<THead, false>>
  : never;

export type Every<TExpressions extends Constants.BooleanValue[]> = TExpressions extends [
  infer THead extends Constants.BooleanValue,
  ...infer TTail extends Constants.BooleanValue[]
]
  ? If<Array.IsNotEmpty<TTail>, And<THead, Every<TTail>>, And<THead, Constants.True>>
  : never;

export type And<
  TLeft extends Constants.BooleanValue,
  TRight extends Constants.BooleanValue
> = IsTrue<IsTrue<TLeft> | IsTrue<TRight>>;

export type Or<TLeft extends Constants.BooleanValue, TRight extends Constants.BooleanValue> = Not<
  IsFalse<IsTrue<TLeft> | IsTrue<TRight>>
>;

export type Intersect<TValues extends unknown[]> = TValues extends [
  infer THead,
  ...infer TTail extends unknown[]
]
  ? Simplify<THead & If<Array.IsNotEmpty<TTail>, Intersect<TTail>, unknown>>
  : never;
