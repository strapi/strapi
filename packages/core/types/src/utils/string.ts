import type { Extends } from './expression';

/**
 * Alias for any literal type (useful for template string parameters)
 *
 * @see {@link Split}
 * @see {@link Suffix}
 * @see {@link Prefix}
 * @see {@link StartsWith}
 * @see {@link EndsWith}
 */
export type Literal = string | number | bigint | boolean;

/**
 * Ensures that a string is not empty.
 *
 * @template T - The type that extends a string.
 *
 * @example
 * // T is assigned a string type
 * type A = NonEmpty<string>;
 * // A can be any string except the empty string
 * let a: A = "hello"; // Valid
 * a = ""; // Error: Type '""' is not assignable to type 'NonEmpty<string>'
 *
 * @example
 * // T is assigned a string literal type
 * type B = NonEmpty<"hello">;
 * // B can only be "hello"
 * let b: B = "hello"; // Valid
 * b = ""; // Error: Type '""' is not assignable to type 'NonEmpty<"hello">'
 */
export type NonEmpty<T extends string> = T extends '' ? never : T;

/**
 * Splits a given string ({@link TValue}) around occurrences of a given separator ({@link TSeparator}).
 *
 * The resulting type is an array where each item is a part of the original string that falls between two instances of the separator.
 *
 * If the string does not contain the separator, the array will contain just the original string.
 *
 * If the string is empty, the result is an empty array.
 *
 * @template TValue - The string to split. Must extend `string`.
 * @template TSeparator - The character(s) used to determine in which locations the string should be split. Must be a `string`.
 *
 * @example
 *
 * ```typescript
 *  type Example = Split<'a.b.c.d', '.'>;  // Output will be: ['a', 'b', 'c', 'd']
 * ```
 * In the above example, the string 'a.b.c.d' is split around occurrences of the '.' separator.
 *
 * @example
 *
 * ```typescript
 *  type ExampleUnion = Split<'a.b-c', '.' | '-'>;  // Output will be: ['a', 'b-c'] | ['a.b', 'c']
 * ```
 * The split operation will distribute the union members and create two possible return type for the union
 */
export type Split<TValue extends string, TSeparator extends string> = {
  [TSep in TSeparator]: TValue extends `${infer TLeft}${TSep}${infer TRight}`
    ? [TLeft, ...Split<TRight, TSep>]
    : TValue extends ''
      ? []
      : [TValue];
}[TSeparator];

/**
 * The `Suffix` type appends a literal suffix ({@link TSuffix}) to the end of a provided string ({@link TValue}).
 *
 * @template TValue - The string to add the suffix to.
 * @template TSuffix - It extends the {@link Literal} type, and represents the suffix to append.
 *
 * @example
 * ```typescript
 * // A type that appends '.com' to a string
 * type DomainName = Suffix<string, '.com'>;
 * const myComDomain: DomainName = 'example.com'; // This is valid
 * const myNetDomain: DomainName = 'example.net'; // This is not valid
 *
 * // A variant using `number` as literal
 * type SuffixedNumber = Suffix<string, 1>;
 * const mySuffixedNumber: SuffixedNumber = 'example1'; // Also valid
 * ```
 */
export type Suffix<TValue extends string, TSuffix extends Literal> = `${TValue}${TSuffix}`;

/**
 * Prepend a literal prefix ({@link TPrefix}) to the start of a provided string ({@link TValue}).
 *
 * @template TValue - The string to add the prefix to.
 * @template TPrefix - It extends the {@link Literal} type, and represents the prefix to prepend.
 *
 * @example
 * ```typescript
 * // A type that prepends 'Hello ' to a string
 * type Greeting = Suffix<string, 'Hello '>;
 * const greeting: Greeting = 'Hello Bob'; // This is valid
 * const farewell: Greeting = 'Bye Bob'; // This is not valid
 * ```
 */
export type Prefix<TValue extends string, TPrefix extends Literal> = `${TPrefix}${TValue}`;

/**
 * Creates an indexed object where every key is a string and every value is `T`
 *
 * @template T - Value type of the dictionary
 *
 * @example
 * // Dictionary where each key is a string and is bound to a number type value.
 * const numDict: Dict<number> = {
 *   'a': 1,
 *   'b': 2,
 *   'c': 3
 * };
 */
export type Dict<T> = { [key: string]: T };

/**
 * Determines if a string, represented by {@link TValue}, ends with a specific literal ({@link TSuffix}).
 *
 * @template TValue - The string to check.
 * @template TSuffix - A literal which may or may not be at the end of {@link TValue}.
 *
 * @remark
 * To remember easily: `String.prototype.endsWith` method but at type level.
 *
 * @example
 * ```typescript
 * type Result = EndsWith<"HelloWorld", "World">;
 * // Output: Constants.True
 * ```
 *
 * ```typescript
 * type Result = EndsWith<"HelloWorld", "Hello">;
 * // Output: Constants.False
 * ```
 */
export type EndsWith<TValue extends string, TSuffix extends Literal> = Extends<
  TValue,
  `${string}${TSuffix}`
>;

/**
 * Determines if a string, represented by {@link TValue}, starts with a specific literal ({@link TPrefix}).
 *
 * @template TValue - The string to check.
 * @template TPrefix - A literal which may or may not be at the start of {@link TValue}.
 *
 * @remark
 * To remember easily: `String.prototype.startsWith` method but at type level.
 *
 * @example
 * ```typescript
 * type IsHelloWorld = StartsWith<"Hello World", "Hello">;
 * // Output: Constants.True
 * ```
 *
 * @example
 * ```typescript
 * type NotHelloWorld = StartsWith<"World Hello", "Hello">;
 * // Output: Constants.False
 * ```
 */
export type StartsWith<TValue extends string, TPrefix extends Literal> = Extends<
  TValue,
  `${TPrefix}${string}`
>;
