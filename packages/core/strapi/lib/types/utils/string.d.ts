import type { Utils } from '@strapi/strapi';

/**
 * Alias for any literal type (useful for template string parameters)
 */
export type Literal = string | number | bigint | boolean;

/**
 * Used to check if a string includes a given literal
 */
export type Includes<T extends Literal> = `${string}${T}${string}`;

/**
 * Used to make sure the given string is not empty
 */
export type NonEmpty<T extends string> = T extends '' ? never : T;

/**
 * Split the given string into a tuple using the given `TSeparator` literal
 */
export type Split<
  TValue extends string,
  TSeparator extends Literal
> = TValue extends `${infer TLeft}${TSeparator}${infer TRight}`
  ? [TLeft, ...Split<TRight, TSeparator>]
  : TValue extends ''
  ? []
  : [TValue];

/**
 * Add a literal suffix (`TSuffix`) at the end of the given string
 */
export type Suffix<TValue extends string, TSuffix extends Literal> = `${TValue}${TSuffix}`;

/**
 * Add a literal prefix (`TPrefix`) at the beginning of the given string
 */
export type Prefix<TValue extends string, TPrefix extends Literal> = `${TPrefix}${TValue}`;

/**
 * Creates a record where every key is a string and every value is `T`
 */
export type Dict<T> = Record<string, T>;

/**
 * Checks if a given string ends with the given literal
 */
export type EndsWith<TValue extends string, TSuffix extends Literal> = Utils.Expression.Extends<
  TValue,
  `${string}${TSuffix}`
>;

/**
 * Checks if a given string starts with the given literal
 */
export type StartsWith<TValue extends string, TPrefix extends Literal> = Utils.Expression.Extends<
  TValue,
  `${TPrefix}${string}`
>;
