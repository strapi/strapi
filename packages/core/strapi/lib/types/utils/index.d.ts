export * as Array from './array';
export * as Guard from './guard';
export * as Object from './object';
export * as String from './string';
export * as Tuple from './tuple';
export * as Expression from './expression';

/**
 * Get the type of a specific key `TKey` in `TValue`
 *
 * @example
 *
 * type X = Get<{ foo: 'bar', 'bar': 'foo' }, 'foo'>
 * // 'bar'
 *
 * type X = Get<{ foo: 'bar', 'bar': 'foo' }, 'bar'>
 * // 'foo'
 */
export type Get<TValue, TKey extends keyof TValue> = TValue[TKey];
