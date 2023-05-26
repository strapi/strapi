/**
 * Assign a default value `U` to `T` if `T` is of type `never`
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
export type Never<T, U = unknown> = [T] extends [never] ? U : T;
