import type { Utils } from '@strapi/strapi';

export type True = true;
export type False = false;
export type BooleanValue = True | False;

export type Extends<TLeft, TRight> = [TLeft] extends [TRight] ? True : False;

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

export type MatchAll<TTests extends Test[], TDefault = never> = TTests extends [
  infer THead extends Test,
  ...infer TTail extends Test[]
]
  ? THead extends Test<infer TExpression, infer TValue>
    ? Utils.Guard.Never<
        If<TExpression, TValue> | If<Utils.Array.IsNotEmpty<TTail>, MatchAll<TTail, TDefault>>,
        TDefault
      >
    : never
  : never;

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

export type And<TLeft extends BooleanValue, TRight extends BooleanValue> = Extends<
  Extends<TLeft, True> | Extends<TRight, True>,
  True
>;

export type Or<TLeft extends BooleanValue, TRight extends BooleanValue> = Not<
  Extends<Extends<TLeft, True> | Extends<TRight, True>, False>
>;
