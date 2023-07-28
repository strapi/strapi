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
export type Never<TValue, TDefault = unknown> = [TValue] extends [never] ? TDefault : TValue;
