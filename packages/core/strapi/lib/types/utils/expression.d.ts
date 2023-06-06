export type True = true;
export type False = false;
export type TBooleanExpression = True | False;

export type Extends<TLeft, TRight> = [TLeft] extends [TRight] ? True : False;

export type If<TExpression extends TBooleanExpression, TOnTrue> = TExpression extends True
  ? TOnTrue
  : never;

export type IfElse<
  TExpression extends TBooleanExpression,
  TOnTrue,
  TOnFalse
> = TExpression extends True ? TOnTrue : TOnFalse;
