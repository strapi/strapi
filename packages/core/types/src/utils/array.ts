import type { Extends, Not, Constants } from './';

/**
 * Extract the array values into a union type
 */
export type Values<TCollection extends Array<unknown>> = TCollection extends Array<infer TValues>
  ? TValues
  : never;

/**
 * Checks if the size of the given collection equals 0
 */
export type IsEmpty<TCollection extends Array<unknown>> = Extends<TCollection['length'], 0>;

/**
 * Checks if the size of the given collection is not 0
 *
 * Returns a {@link Constants.BooleanValue} expression
 */
export type IsNotEmpty<TCollection extends Array<unknown>> = Not<IsEmpty<TCollection>>;
