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
