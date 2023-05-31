export * as Array from './array';
export * as Guard from './guard';
export * as Object from './object';
export * as String from './string';
export * as Tuple from './tuple';

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
