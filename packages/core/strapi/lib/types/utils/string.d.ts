/**
 * Alias for any literal type (useful for template string parameters)
 */
export type Literal = string | number | bigint | boolean;

/**
 * Used to check if a string includes a given literal
 */
export type Includes<S extends Literal> = `${string}${S}${string}`;

/**
 * Used to make sure the given string is not empty
 */
export type NonEmpty<T extends string> = T extends '' ? never : T;

/**
 * Split the given string into a tuple using the given `S` literal
 */
export type Split<T extends string, S extends Literal> = T extends `${infer A}${S}${infer B}`
  ? [A, ...Split<B, S>]
  : T extends ''
  ? []
  : [T];

/**
 * Add a literal suffix (`S`) at the end of the given string
 */
export type Suffix<T extends string, S extends Literal> = `${T}${S}`;

/**
 * Add a literal prefix (`S`) at the beginning of the given string
 */
export type Prefix<T extends string, S extends Literal> = `${S}${T}`;

/**
 * Creates a record where every key is a string and every value is `T`
 */
export type Dict<T> = Record<string, T>;
