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

export type Without<TLeft, TRight> = { [key in Exclude<keyof TLeft, keyof TRight>]?: never };

export type XOR<TLeft, TRight> = TLeft | TRight extends object
  ? (Without<TLeft, TRight> & TRight) | (Without<TRight, TLeft> & TLeft)
  : TLeft | TRight;

export type Cast<TValue, TType> = TValue extends TType ? TValue : never;
