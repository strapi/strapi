export * as Constants from './constants';
export * as Array from './array';
export * as Guard from './guard';
export * as Object from './object';
export * as String from './string';
export * as Function from './function';
export * as Tuple from './tuple';

export * from './expression';
export * from './json';

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

/**
 * Represents a simplified version of a given intersection type.
 *
 * It flattens the properties of every component in the intersection {@link T}, and returns a unified object.
 *
 * @template T The original type to be simplified.
 */
export type Simplify<T extends unknown> = { [TKey in keyof T]: T[TKey] };

export type Without<TLeft, TRight> = { [key in Exclude<keyof TLeft, keyof TRight>]?: never };

export type XOR<TLeft, TRight> = TLeft | TRight extends object
  ? (Without<TLeft, TRight> & TRight) | (Without<TRight, TLeft> & TLeft)
  : TLeft | TRight;

export type Cast<TValue, TType> = TValue extends TType ? TValue : never;

export type PartialWithThis<T> = Partial<T> & ThisType<T>;
