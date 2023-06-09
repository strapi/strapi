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

export type Test<TExpression extends BooleanValue = BooleanValue, TValue = unknown> = [
  TExpression,
  TValue
];
