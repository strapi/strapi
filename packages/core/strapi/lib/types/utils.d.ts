/**
 *
 * Common utilities used across Strapi typings
 *
 * */

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
