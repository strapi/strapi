/**
 *
 * Common utilities used across Strapi typings
 *
 * */

/**
 * Alias for any literal type (useful for template string parameters)
 */
export type Literal = string | number | bigint | boolean;

/**
 * Used to check if a string contains a given literal
 */
export type Contains<S extends Literal> = `${string}${S}${string}`;

/**
 * Used to make sure the given string is not empty
 */
export type NonEmpty<T extends string> = T extends '' ? never : T;

/**
 * Split the given string into a tuple using the given `S` literal
 */
export type Split<T extends string, S extends Literal> = T extends `${infer A}${S}${infer B}`
  ? [A, ...Split<B, S>]
  : T extends ''
  ? []
  : [T];

/**
 * Aggregate the given tuple into a string, separated by the given `S` literal
 */
export type Join<T extends unknown[], S extends Literal> = T extends [
  infer F extends Literal,
  ...infer R
]
  ? R['length'] extends 0
    ? F
    : `${F}${S}${Join<R, S>}`
  : never;

/**
 * Add a literal suffix (`S`) at the end of the given string
 */
export type Suffix<T extends string, S extends Literal> = `${T}${S}`;

/**
 * Add a literal prefix (`S`) at the beginning of the given string
 */
export type Prefix<T extends string, S extends Literal> = `${S}${T}`;

/**
 *
 * Extract the array values into an union type
 *
 **/
export type GetArrayValues<T extends Array<unknown>> = T extends Array<infer U> ? U : never;

/**
 * Creates a record where every key is a string and every value is `T`
 */
export type StringRecord<T> = Record<string, T>;

/**
 * Retrieve object's (`T`) keys if they extends the given `U` type.
 *
 * @example
 * type X = KeysBy<{ foo: 'bar', bar: 'foo', foobar: 2 }, string>
 * // 'foo' | 'bar'
 *
 * type Base = { x: 'foo' | 'bar' };
 * type Obj = { foo: { x: 'foo' }, bar: { x: 'bar' }, other: { x: '42' } };
 * type X = KeysBy<Obj, Base>
 * // 'foo' | 'bar'
 */
export type KeysBy<T, U> = {
  [key in keyof T]: T[key] extends U ? key : never;
}[keyof T];

/**
 * Retrieve object's (`T`) properties if their value extends the given `U` type.
 *
 * @example
 * type X = KeysBy<{ foo: 'bar', bar: 'foo', foobar: 2 }, string>
 * // { foo: 'bar', bar: 'foo' }
 *
 * type Base = { x: 'foo' | 'bar' };
 * type Obj = { foo: { x: 'foo' }, bar: { x: 'bar' }, other: { x: '42' } };
 * type X = KeysBy<Obj, Base>
 * // { foo: { x: 'foo' }, bar: { x: 'bar' } }
 */
export type PickBy<T, U> = Pick<T, KeysBy<T, U>>;

/**
 * Assign a default value `U` to `T` if `T` is of type `never`
 *
 * @example
 * type X = NeverGuard<{ foo: 'bar' }, string>
 * // { foo: 'bar' }
 *
 * type X = NeverGuard<never>
 * // unknown
 *
 * type X = NeverGuard<never, string>
 * // string
 */
export type NeverGuard<T, U = unknown> = [T] extends [never] ? U : T;

/**
 * Dynamic type based on the keys of `Strapi.Schemas`.
 * It represents all the registered schemas' UID as a union type.
 *
 * @example
 *
 * declare global {
 *   namespace Strapi {
 *     interface Schemas {
 *       'api::foo.foo': CollectionTypeSchema;
 *       'api::bar.bar': ComponentSchema;
 *     }
 *   }
 * }
 *
 * type X = SchemaUID;
 * // 'api::foo.foo' | 'api::bar.bar'
 */
export type SchemaUID = keyof Strapi.Schemas;

/**
 * Get the type of a specific key `U` in `T`
 *
 * @example
 *
 * type X = Get<{ foo: 'bar', 'bar': 'foo' }, 'foo'>
 * // 'bar'
 *
 * type X = Get<{ foo: 'bar', 'bar': 'foo' }, 'bar'>
 * // 'foo'
 */
export type Get<T, U extends keyof T> = T[U];
