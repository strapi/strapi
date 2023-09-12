import type { Utils } from '@strapi/strapi';

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
  ? Utils.Expression.If<
      Utils.Expression.StrictEqual<TValue, THead>,
      TFallback,
      Utils.Expression.If<Utils.Array.IsNotEmpty<TTail>, OfTypes<TTail, TValue, TFallback>, TValue>
    >
  : never;
