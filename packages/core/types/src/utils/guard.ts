import type { Array, If, StrictEqual } from '.';

/**
 * Assign a default value `TDefault` to `TValue` if `TValue` is of type `never`
 *
 * @example
 * type X = Never<{ foo: 'bar' }, string>
 * // { foo: 'bar' }
 *
 * type X = Never<never>
 * // unknown
 *
 * type X = Never<never, string>
 * // string
 */
export type Never<TValue, TFallback = unknown> = OfTypes<[never], TValue, TFallback>;

export type OfTypes<TTypes extends unknown[], TValue, TFallback = unknown> = TTypes extends [
  infer THead extends unknown,
  ...infer TTail extends unknown[]
]
  ? If<
      StrictEqual<TValue, THead>,
      TFallback,
      If<Array.IsNotEmpty<TTail>, OfTypes<TTail, TValue, TFallback>, TValue>
    >
  : never;

export type EmptyObject<TValue, TFallback = unknown> = OfTypes<[{}], TValue, TFallback>;
