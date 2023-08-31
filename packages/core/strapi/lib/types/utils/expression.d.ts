import type { Utils } from '@strapi/strapi';

export type True = true;
export type False = false;
export type BooleanValue = True | False;

export type IsNever<TValue> = StrictEqual<TValue, never>;

export type IsNotNever<TValue> = Not<IsNever<TValue>>;

export type IsTrue<TValue> = [TValue] extends [True] ? True : False;

export type IsFalse<TValue> = [TValue] extends [False] ? True : False;

export type StrictEqual<TValue, TMatch> = And<Extends<TValue, TMatch>, Extends<TMatch, TValue>>;

export type Extends<TLeft, TRight> = [TLeft] extends [TRight] ? True : False;

export type DoesNotExtends<TLeft, TRight> = Not<Extends<TLeft, TRight>>;

export type Not<TExpression extends BooleanValue> = If<TExpression, False, True>;

export type If<TExpression extends BooleanValue, TOnTrue, TOnFalse = never> = [
  TExpression
] extends [True]
  ? TOnTrue
  : TOnFalse;

export type MatchFirst<TTests extends Test[], TDefault = never> = TTests extends [
  infer THead extends Test,
  ...infer TTail extends Test[]
]
  ? THead extends Test<infer TExpression, infer TValue>
    ? If<
        TExpression,
        TValue,
        If<Utils.Array.IsNotEmpty<TTail>, MatchFirst<TTail, TDefault>, TDefault>
      >
    : never
  : never;

export type MatchAllUnion<TTests extends Test[], TDefault = never> = TTests extends [
  infer THead extends Test,
  ...infer TTail extends Test[]
]
  ? THead extends Test<infer TExpression, infer TValue>
    ? Utils.Guard.Never<
        If<TExpression, TValue> | If<Utils.Array.IsNotEmpty<TTail>, MatchAllUnion<TTail, TDefault>>,
        TDefault
      >
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
        If<Utils.Array.IsNotEmpty<TTail>, MatchAllIntersect<TTail, TDefault>, TDefault>
    : TDefault
  : TDefault;

export type Test<TExpression extends BooleanValue = BooleanValue, TValue = unknown> = [
  TExpression,
  TValue
];

export type Some<TExpressions extends BooleanValue[]> = TExpressions extends [
  infer THead extends BooleanValue,
  ...infer TTail extends BooleanValue[]
]
  ? If<Utils.Array.IsNotEmpty<TTail>, Or<THead, Some<TTail>>, Or<THead, false>>
  : never;

export type Every<TExpressions extends BooleanValue[]> = TExpressions extends [
  infer THead extends BooleanValue,
  ...infer TTail extends BooleanValue[]
]
  ? If<Utils.Array.IsNotEmpty<TTail>, And<THead, Every<TTail>>, And<THead, True>>
  : never;

export type And<TLeft extends BooleanValue, TRight extends BooleanValue> = IsTrue<
  IsTrue<TLeft> | IsTrue<TRight>
>;

export type Or<TLeft extends BooleanValue, TRight extends BooleanValue> = Not<
  IsFalse<IsTrue<TLeft> | IsTrue<TRight>>
>;
