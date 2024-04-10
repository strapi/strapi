import type { Array, If, StrictEqual } from '.';

/**
 * Conditionally assigns a fallback type {@link TFallback} to a type {@link TValue}, if {@link TValue} resolves to `never`.
 *
 * Otherwise, it assigns the type of {@link TValue}.
 *
 * @template TValue - The original type which could be any type or `never`.
 * @template TFallback - The fallback type that will be assigned to {@link TValue} if {@link TValue} is `never`. It defaults to `unknown`.
 *
 * @remark
 * This type becomes useful when working with conditional types where there are possibilities of ending up with `never` type.
 *
 * It provides a way to ensure that, in such situations, the type defaults to a more meaningful type rather than `never`.
 *
 * @example
 * ```typescript
 * type User = { name: 'John' }
 *
 * type X = Guard.Never<User>;  // X: User
 * ```
 *
 * @example
 * ```typescript
 * type NoType = never;
 *
 * type X = Guard.Never<NoType>;  // X: unknown
 * type Y = Guard.Never<NoType, string>;  // Y: string
 * ```
 */
export type Never<TValue, TFallback = unknown> = OfTypes<[never], TValue, TFallback>;

/**
 * Conditionally assigns a fallback type {@link TFallback} to a type {@link TValue}, if {@link TValue} resolves to `{}`.
 *
 * Otherwise, it assigns the type of {@link TValue}.
 *
 * @template TValue - The original type which could be any type or `{}`.
 * @template TFallback - The fallback type that will be assigned to {@link TValue} if {@link TValue} is `{}`. It defaults to `unknown`.
 *
 * @remark
 * This type becomes useful when working with conditional types where there are possibilities of ending up with `{}` type.
 *
 * It provides a way to ensure that, in such situations, the type defaults to a more meaningful type rather than `{}`.
 *
 * @example
 * ```typescript
 * type User = { name: 'John' }
 *
 * type X = Guard.EmptyObject<User>;  // X: User
 * ```
 *
 * @example
 * ```typescript
 * type MyObj = {};
 *
 * type X = Guard.EmptyObject<MyObj>;  // X: unknown
 * type Y = Guard.EmptyObject<MyObj, string>;  // Y: string
 * ```
 */
// eslint-disable-next-line @typescript-eslint/ban-types
export type EmptyObject<TValue, TFallback = unknown> = OfTypes<[{}], TValue, TFallback>;

/**
 * Conditionally assigning a fallback type (@link TFallback) if the value type ({@link TValue}) matches any of the types in {@link TTypes}.
 *
 * It basically enables conditional type assignments based on type matching.
 *
 * The value is checked against the list of types iteratively. If it matches any type from the list, the fallback type is assigned.
 *
 * If it doesn't match, the value's original type is maintained.
 *
 * If no fallback is provided, unknown type is used by default.
 *
 * @template TTypes - A tuple of types to match the value against. It must extend Array<unknown>
 * @template TValue - The value whose type is checked against TTypes.
 * @template TFallback - The type to be assigned if TValue matches any member of TTypes. It defaults to unknown.
 *
 * @example
 * Here, the `TValue` is `string` which exists in the `TTypes` list. Thus, the `TFallback` which is `null` is returned.
 * ```typescript
 * type Result = OfTypes<[string, number], string, null>; // Result: null
 * ```
 *
 * Here, the `TValue` is `boolean` which does not exist in the `TTypes` list. Thus, the `TValue` is returned as no match was found.
 * ```typescript
 * type Result = OfTypes<[string, number], boolean, number>; // Result: boolean
 * ```
 */
export type OfTypes<TTypes extends unknown[], TValue, TFallback = unknown> = TTypes extends [
  infer THead extends unknown,
  ...infer TTail extends unknown[],
]
  ? If<
      StrictEqual<TValue, THead>,
      TFallback,
      If<Array.IsNotEmpty<TTail>, OfTypes<TTail, TValue, TFallback>, TValue>
    >
  : never;
