import type { Literal } from './string';

/**
 * Transforms a tuple ({@link TCollection}) into a concatenated string, interlaced with a designated separator character ({@link TSeparator}).
 *
 * @template TCollection - Represents the array of elements to be joined.
 * @template TSeparator - Represents the separator character used to join the elements of {@link TCollection}.
 *
 * @example
 * ```typescript
 * type R1 = Join<["John", "Doe", "Smith"], ",">; // type R1 = "John,Doe,Smith"
 * type R2 = Join<[1, 2, 3, 4], "-">; // type R2 = "1-2-3-4"
 * type R3 = Join<["Foo", "Bar", "Baz"], "," | "-">; // type R3 = "Foo,Bar,Baz" | "Foo-Bar-Baz"
 * ```
 */
export type Join<TCollection extends unknown[], TSeparator extends Literal> = TCollection extends [
  infer THead extends Literal,
  ...infer TTail,
]
  ? TTail['length'] extends 0
    ? THead
    : `${THead}${TSeparator}${Join<TTail, TSeparator>}`
  : never;
