import type { Extends, Not } from '.';

/**
 * The `Values` type extracts the type of the values stored in arrays or tuples.
 *
 * @returns A union of every value contained in the array/tuple
 *
 * @template TCollection - The array-like structure from which the values' type will be extracted.
 *
 * @example
 * Let's suppose we have an array of numbers, and we would like to extract the type its values
 *
 * ```typescript
 * type MyTuple = [1, 2, 3, 4];
 *
 * type TupleValues = Values<MyTuple>; // TupleValues: 1 | 2 | 3 | 4
 * ```
 *
 * @example
 * Now, let's suppose we have a regular TypeScript array, and we would like to extract its value
 *
 * ```typescript
 * type MyArray = (string | number)[];
 *
 * type ArrayValues = Values<MyArray>; // ArrayValues: string | number
 * ```
 */
export type Values<TCollection extends Array<unknown>> =
  TCollection extends Array<infer TValues> ? TValues : never;

/**
 * Checks if a given array ({@link TCollection}) is empty.
 *
 * @template TCollection - The array to be checked. It should extend 'Array<unknown>'.
 *
 * @example
 * Validate an array that is empty:
 * ```typescript
 * type EmptyArray = [];
 *
 * type IsEmptyCheck = IsEmpty<EmptyArray>;
 * // Result: Constants.True
 * ```
 *
 * @example
 * Validate an array that is not empty:
 * ```typescript
 * type NonEmptyArray = [1, 2, 3];
 *
 * type IsEmptyCheck = IsEmpty<NonEmptyArray>;
 * // Result: Constants.False
 * ```
 */
export type IsEmpty<TCollection extends Array<unknown>> = Extends<TCollection['length'], 0>;

/**
 * Checks if a given array ({@link TCollection}) is not empty.
 *
 * @template TCollection - The collection (array) that needs to be checked if it's not empty. It must extend 'Array<unknown>'.
 *
 * @see {@link Not}
 * @see {@link IsEmpty}
 *
 * @example
 * Checking non-empty array:
 * ```typescript
 * type NonEmptyArray = [1, 2, 3];
 *
 * // This type checks will result to True because
 * // 'NonEmptyArray' is indeed not empty.
 * type IsNotEmptyCheck = IsNotEmpty<NonEmptyArray>;
 * ```
 *
 * @example
 * Checking empty array:
 * ```typescript
 * type EmptyArray = [];
 *
 * // This type checks will result to False because 'EmptyArray' is empty.
 * type IsNotEmptyCheck = IsNotEmpty<EmptyArray>;
 * ```
 */
export type IsNotEmpty<TCollection extends Array<unknown>> = Not<IsEmpty<TCollection>>;
